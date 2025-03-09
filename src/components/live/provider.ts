import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { guard } from 'lit/directives/guard.js';
import { createRef, Ref, ref } from 'lit/directives/ref.js';
import { CameraEndpoints } from '../../camera-manager/types.js';
import { MicrophoneState } from '../../card-controller/types.js';
import { dispatchLiveErrorEvent } from '../../components-lib/live/utils/dispatch-live-error.js';
import { PartialZoomSettings } from '../../components-lib/zoom/types.js';
import {
  CameraConfig,
  CardWideConfig,
  configDefaults,
  LiveConfig,
  LiveProvider,
} from '../../config/types.js';
import { STREAM_TROUBLESHOOTING_URL } from '../../const.js';
import { HomeAssistant } from '../../ha/types.js';
import { localize } from '../../localize/localize.js';
import liveProviderStyle from '../../scss/live-provider.scss';
import { MediaPlayer, MediaPlayerController, MediaPlayerElement } from '../../types.js';
import { aspectRatioToString } from '../../utils/basic.js';
import { dispatchMediaUnloadedEvent } from '../../utils/media-info.js';
import { updateElementStyleFromMediaLayoutConfig } from '../../utils/media-layout.js';
import '../icon.js';
import { renderMessage } from '../message.js';
import '../next-prev-control.js';
import '../ptz.js';
import '../surround.js';

@customElement('advanced-camera-card-live-provider')
export class AdvancedCameraCardLiveProvider extends LitElement implements MediaPlayer {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @property({ attribute: false })
  public cameraConfig?: CameraConfig;

  @property({ attribute: false })
  public cameraEndpoints?: CameraEndpoints;

  @property({ attribute: false })
  public liveConfig?: LiveConfig;

  // Whether or not to load the video for this camera. If `false`, no contents
  // are rendered until this attribute is set to `true` (this is useful for lazy
  // loading).
  @property({ attribute: true, type: Boolean })
  public load = false;

  // Label that is used for ARIA support and as tooltip.
  @property({ attribute: false })
  public label = '';

  @property({ attribute: false })
  public cardWideConfig?: CardWideConfig;

  @property({ attribute: false })
  public microphoneState?: MicrophoneState;

  @property({ attribute: false })
  public zoomSettings?: PartialZoomSettings | null;

  @state()
  protected _isVideoMediaLoaded = false;

  @state()
  protected _hasProviderError = false;

  @state()
  protected _showStreamTroubleshooting = false;

  protected _refProvider: Ref<MediaPlayerElement> = createRef();

  // A note on dynamic imports:
  //
  // We gather the dynamic live provider import promises and do not consider the
  // update of the element complete until these imports have returned. Without
  // this behavior calls to the media methods (e.g. `mute()`) may throw if the
  // underlying code is not yet loaded.
  //
  // Test case: A card with a non-live view, but live pre-loaded, attempts to
  // call mute() when the <advanced-camera-card-live> element first renders in the
  // background. These calls fail without waiting for loading here.
  protected _importPromises: Promise<unknown>[] = [];

  public async getMediaPlayerController(): Promise<MediaPlayerController | null> {
    await this.updateComplete;
    return (await this._refProvider.value?.getMediaPlayerController()) ?? null;
  }

  /**
   * Get the fully resolved live provider.
   * @returns A live provider (that is not 'auto').
   */
  protected _getResolvedProvider(): Omit<LiveProvider, 'auto'> {
    if (this.cameraConfig?.live_provider === 'auto') {
      if (
        this.cameraConfig?.webrtc_card?.entity ||
        this.cameraConfig?.webrtc_card?.url
      ) {
        return 'webrtc-card';
      } else if (this.cameraConfig?.camera_entity) {
        return 'ha';
      } else if (this.cameraConfig?.frigate.camera_name) {
        return 'jsmpeg';
      }
      return configDefaults.cameras.live_provider;
    }
    return this.cameraConfig?.live_provider || 'image';
  }

  /**
   * Determine if a camera image should be shown in lieu of the real stream
   * whilst loading.
   * @returns`true` if an image should be shown.
   */
  protected _shouldShowImageDuringLoading(): boolean {
    return (
      !this._isVideoMediaLoaded &&
      !!this.cameraConfig?.camera_entity &&
      !!this.hass &&
      !!this.liveConfig?.show_image_during_load &&
      !this._showStreamTroubleshooting &&
      // Do not continue to show image during loading if an error has occurred.
      !this._hasProviderError
    );
  }

  public disconnectedCallback(): void {
    this._isVideoMediaLoaded = false;
  }

  protected _videoMediaShowHandler(): void {
    this._isVideoMediaLoaded = true;
    this._showStreamTroubleshooting = false;
  }

  protected _providerErrorHandler(): void {
    this._hasProviderError = true;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('load')) {
      if (!this.load) {
        this._isVideoMediaLoaded = false;
        dispatchMediaUnloadedEvent(this);
      }
    }

    if (changedProps.has('liveConfig')) {
      if (this.liveConfig?.show_image_during_load) {
        this._importPromises.push(import('./providers/image.js'));
      }
      if (this.liveConfig?.zoomable) {
        this._importPromises.push(import('../zoomer.js'));
      }
    }

    if (changedProps.has('cameraConfig')) {
      const provider = this._getResolvedProvider();
      if (provider === 'jsmpeg') {
        this._importPromises.push(import('./providers/jsmpeg.js'));
      } else if (provider === 'ha') {
        this._importPromises.push(import('./providers/ha.js'));
      } else if (provider === 'webrtc-card') {
        this._importPromises.push(import('./providers/webrtc-card.js'));
      } else if (provider === 'image') {
        this._importPromises.push(import('./providers/image.js'));
      } else if (provider === 'go2rtc') {
        this._importPromises.push(import('./providers/go2rtc/index.js'));
      }

      updateElementStyleFromMediaLayoutConfig(
        this,
        this.cameraConfig?.dimensions?.layout,
      );
      this.style.aspectRatio = aspectRatioToString({
        ratio: this.cameraConfig?.dimensions?.aspect_ratio,
      });
    }
  }

  override async getUpdateComplete(): Promise<boolean> {
    // See 'A note on dynamic imports' above for explanation of why this is
    // necessary.
    const result = await super.getUpdateComplete();
    await Promise.all(this._importPromises);
    this._importPromises = [];
    return result;
  }

  protected _useZoomIfRequired(template: TemplateResult): TemplateResult {
    return this.liveConfig?.zoomable
      ? html` <advanced-camera-card-zoomer
          .defaultSettings=${guard([this.cameraConfig?.dimensions?.layout], () =>
            this.cameraConfig?.dimensions?.layout
              ? {
                  pan: this.cameraConfig.dimensions.layout.pan,
                  zoom: this.cameraConfig.dimensions.layout.zoom,
                }
              : undefined,
          )}
          .settings=${this.zoomSettings}
          @advanced-camera-card:zoom:zoomed=${async () =>
            (await this.getMediaPlayerController())?.setControls(false)}
          @advanced-camera-card:zoom:unzoomed=${async () =>
            (await this.getMediaPlayerController())?.setControls()}
        >
          ${template}
        </advanced-camera-card-zoomer>`
      : template;
  }

  protected render(): TemplateResult | void {
    if (!this.load || !this.hass || !this.liveConfig || !this.cameraConfig) {
      return;
    }

    // Set title and ariaLabel from the provided label property.
    this.title = this.label;
    this.ariaLabel = this.label;

    const provider = this._getResolvedProvider();
    const showImageDuringLoading = this._shouldShowImageDuringLoading();
    const showLoadingIcon = !this._isVideoMediaLoaded;
    const providerClasses = {
      hidden: showImageDuringLoading,
    };

    if (
      provider === 'ha' ||
      provider === 'image' ||
      (this.cameraConfig?.camera_entity &&
        this.cameraConfig.always_error_if_entity_unavailable)
    ) {
      if (!this.cameraConfig?.camera_entity) {
        dispatchLiveErrorEvent(this);
        return renderMessage({
          message: localize('error.no_live_camera'),
          type: 'error',
          icon: 'mdi:camera',
          context: this.cameraConfig,
        });
      }

      const stateObj = this.hass.states[this.cameraConfig.camera_entity];
      if (!stateObj) {
        dispatchLiveErrorEvent(this);
        return renderMessage({
          message: localize('error.live_camera_not_found'),
          type: 'error',
          icon: 'mdi:camera',
          context: this.cameraConfig,
        });
      }

      if (stateObj.state === 'unavailable') {
        dispatchLiveErrorEvent(this);
        dispatchMediaUnloadedEvent(this);
        return renderMessage({
          message: `${localize('error.live_camera_unavailable')}${
            this.label ? `: ${this.label}` : ''
          }`,
          type: 'info',
          icon: 'mdi:cctv-off',
          dotdotdot: true,
        });
      }
    }

    return html`${this._useZoomIfRequired(html`
      ${showImageDuringLoading || provider === 'image'
        ? html` <advanced-camera-card-live-image
            ${ref(this._refProvider)}
            .hass=${this.hass}
            .cameraConfig=${this.cameraConfig}
            @advanced-camera-card:live:error=${() => this._providerErrorHandler()}
            @advanced-camera-card:media:loaded=${(ev: Event) => {
              if (provider === 'image') {
                // Only count the media has loaded if the required provider is
                // the image (not just the temporary image shown during
                // loading).
                this._videoMediaShowHandler();
              } else {
                ev.stopPropagation();
              }
            }}
          >
          </advanced-camera-card-live-image>`
        : html``}
      ${provider === 'ha'
        ? html` <advanced-camera-card-live-ha
            ${ref(this._refProvider)}
            class=${classMap(providerClasses)}
            .hass=${this.hass}
            .cameraConfig=${this.cameraConfig}
            ?controls=${this.liveConfig.controls.builtin}
            @advanced-camera-card:live:error=${() => this._providerErrorHandler()}
            @advanced-camera-card:media:loaded=${this._videoMediaShowHandler.bind(this)}
          >
          </advanced-camera-card-live-ha>`
        : provider === 'go2rtc'
          ? html`<advanced-camera-card-live-go2rtc
              ${ref(this._refProvider)}
              class=${classMap(providerClasses)}
              .hass=${this.hass}
              .cameraConfig=${this.cameraConfig}
              .cameraEndpoints=${this.cameraEndpoints}
              .microphoneState=${this.microphoneState}
              .microphoneConfig=${this.liveConfig.microphone}
              ?controls=${this.liveConfig.controls.builtin}
              @advanced-camera-card:live:error=${() => this._providerErrorHandler()}
              @advanced-camera-card:media:loaded=${this._videoMediaShowHandler.bind(
                this,
              )}
            >
            </advanced-camera-card-live-go2rtc>`
          : provider === 'webrtc-card'
            ? html`<advanced-camera-card-live-webrtc-card
                ${ref(this._refProvider)}
                class=${classMap(providerClasses)}
                .hass=${this.hass}
                .cameraConfig=${this.cameraConfig}
                .cameraEndpoints=${this.cameraEndpoints}
                .cardWideConfig=${this.cardWideConfig}
                ?controls=${this.liveConfig.controls.builtin}
                @advanced-camera-card:live:error=${() => this._providerErrorHandler()}
                @advanced-camera-card:media:loaded=${this._videoMediaShowHandler.bind(
                  this,
                )}
              >
              </advanced-camera-card-live-webrtc-card>`
            : provider === 'jsmpeg'
              ? html` <advanced-camera-card-live-jsmpeg
                  ${ref(this._refProvider)}
                  class=${classMap(providerClasses)}
                  .hass=${this.hass}
                  .cameraConfig=${this.cameraConfig}
                  .cameraEndpoints=${this.cameraEndpoints}
                  .cardWideConfig=${this.cardWideConfig}
                  @advanced-camera-card:live:error=${() => this._providerErrorHandler()}
                  @advanced-camera-card:media:loaded=${this._videoMediaShowHandler.bind(
                    this,
                  )}
                >
                </advanced-camera-card-live-jsmpeg>`
              : html``}
    `)}
    ${showLoadingIcon
      ? html`<advanced-camera-card-icon
          title=${localize('error.awaiting_live')}
          .icon=${{ icon: 'mdi:progress-helper' }}
          @click=${() => {
            this._showStreamTroubleshooting = !this._showStreamTroubleshooting;
          }}
        ></advanced-camera-card-icon>`
      : ''}
    ${this._showStreamTroubleshooting
      ? renderMessage(
          {
            type: 'error',
            icon: 'mdi:camera-off',
            message: localize('error.stream_not_loading'),
            troubleshootingURL: STREAM_TROUBLESHOOTING_URL,
          },
          { overlay: true },
        )
      : ''}`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(liveProviderStyle);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'advanced-camera-card-live-provider': AdvancedCameraCardLiveProvider;
  }
}
