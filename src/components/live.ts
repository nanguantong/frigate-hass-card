import { CSSResultGroup, LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators';
import { until } from 'lit/directives/until.js';
import { HomeAssistant } from 'custom-card-helpers';

import { signedPathSchema } from '../types';
import type { ExtendedHomeAssistant, FrigateCardConfig } from '../types';

import { localize } from '../localize/localize';
import { homeAssistantWSRequest } from '../common';
import {
  renderMessage,
  renderErrorMessage,
  renderProgressIndicator,
} from '../components/message';

import JSMpeg from '@cycjimmy/jsmpeg-player';

import liveStyle from '../scss/live.scss';

@customElement('frigate-card-live')
export class FrigateCardViewer extends LitElement {
  @property({ attribute: false })
  protected hass!: HomeAssistant & ExtendedHomeAssistant;

  @property({ attribute: false })
  protected config!: FrigateCardConfig;

  protected render(): TemplateResult | void {
    return html`${until(this._render(), renderProgressIndicator())}`;
  }

  protected async _render(): Promise<TemplateResult> {
    return html` ${this.config.live_provider == 'frigate'
      ? html` <frigate-card-live-frigate
          .hass=${this.hass}
          .cameraEntity=${this.config.camera_entity}
        >
        </frigate-card-live-frigate>`
      : this.config.live_provider == 'webrtc'
      ? html`<frigate-card-live-webrtc
          .hass=${this.hass}
          .webRTCConfig=${this.config.webrtc || {}}
        >
        </frigate-card-live-webrtc>`
      : html` <frigate-card-live-jsmpeg
          .hass=${this.hass}
          .cameraName=${this.config.frigate_camera_name}
          .clientId=${this.config.frigate_client_id}
        >
        </frigate-card-live-jsmpeg>`}`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(liveStyle);
  }
}

@customElement('frigate-card-live-frigate')
export class FrigateCardViewerFrigate extends LitElement {
  @property({ attribute: false })
  protected hass!: HomeAssistant & ExtendedHomeAssistant;

  @property({ attribute: false })
  protected cameraEntity!: string;

  protected render(): TemplateResult | void {
    if (!(this.cameraEntity in this.hass.states)) {
      return renderMessage(localize('error.no_live_camera'), 'mdi:camera-off');
    }
    return html` <ha-camera-stream
      .hass=${this.hass}
      .stateObj=${this.hass.states[this.cameraEntity]}
      .controls=${true}
      .muted=${true}
    >
    </ha-camera-stream>`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(liveStyle);
  }
}

// Create a wrapper for the WebRTC element
//  - https://github.com/AlexxIT/WebRTC
@customElement('frigate-card-live-webrtc')
export class FrigateCardViewerWebRTC extends LitElement {
  @property({ attribute: false })
  protected hass!: HomeAssistant & ExtendedHomeAssistant;

  @property({ attribute: false })
  protected webRTCConfig!: Record<string, unknown>;

  protected _webRTCElement: HTMLElement | null = null;

  protected _createWebRTC(): TemplateResult | void {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webrtcElement = customElements.get('webrtc-camera') as any;
    if (webrtcElement) {
      const webrtc = new webrtcElement();
      webrtc.setConfig(this.webRTCConfig);
      webrtc.hass = this.hass;
      this._webRTCElement = webrtc;
    } else {
      throw new Error(localize('error.missing_webrtc'));
    }
  }

  protected render(): TemplateResult | void {
    if (!this._webRTCElement) {
      try {
        this._createWebRTC();
      } catch (e) {
        return renderErrorMessage((e as Error).message);
      }
    }
    return html`${this._webRTCElement}`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(liveStyle);
  }
}

@customElement('frigate-card-live-jsmpeg')
export class FrigateCardViewerJSMPEG extends LitElement {
  @property({ attribute: false })
  protected hass!: HomeAssistant & ExtendedHomeAssistant;

  @property({ attribute: false })
  protected cameraName!: string;

  @property({ attribute: false })
  protected clientId!: string;

  protected _jsmpegCanvasElement: HTMLElement | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _jsmpegVideoPlayer: any | null = null;

  protected async _getURL(): Promise<string | null> {
    if (!this.hass) {
      return null;
    }

    const request = {
      type: 'auth/sign_path',
      path: `/api/frigate/${this.clientId}` + `/jsmpeg/${this.cameraName}`,
    };
    // Sign the path so it includes an authSig parameter.
    let response;
    try {
      response = await homeAssistantWSRequest(this.hass, signedPathSchema, request);
    } catch (err) {
      console.warn(err);
      return null;
    }
    const url = this.hass.hassUrl(response.path);
    return url.replace(/^http/i, 'ws');
  }

  disconnectedCallback(): void {
    if (this._jsmpegVideoPlayer) {
      this._jsmpegVideoPlayer.destroy();
      this._jsmpegVideoPlayer = null;
    }
    this._jsmpegCanvasElement = null;
    super.disconnectedCallback();
  }

  protected render(): TemplateResult | void {
    return html`${until(this._render(), renderProgressIndicator())}`;
  }

  protected async _render(): Promise<TemplateResult> {
    if (!this._jsmpegCanvasElement) {
      this._jsmpegCanvasElement = document.createElement('canvas');
      this._jsmpegCanvasElement.className = 'media';
    }

    if (!this._jsmpegVideoPlayer) {
      const jsmpeg_url = await this._getURL();

      if (!jsmpeg_url) {
        return renderErrorMessage('Could not retrieve or sign JSMPEG websocket path');
      }

      // Return the html canvas node only after the JSMPEG video has loaded and
      // is playing, to reduce the amount of time the user is staring at a blank
      // white canvas (instead they get the progress spinner until this promise
      // resolves).
      return new Promise<TemplateResult>((resolve) => {
        this._jsmpegVideoPlayer = new JSMpeg.VideoElement(
          this,
          jsmpeg_url,
          {
            canvas: this._jsmpegCanvasElement,
            hooks: {
              play: () => {
                resolve(html`${this._jsmpegCanvasElement}`);
              },
            },
          },
          { protocols: [], videoBufferSize: 1024 * 1024 * 4 },
        );
      });
    }
    return html`${this._jsmpegCanvasElement}`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(liveStyle);
  }
}
