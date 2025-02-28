import { HomeAssistant } from '@dermotduffy/custom-card-helpers';
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { MenuSubmenu, MenuSubmenuItem, MenuSubmenuSelect } from '../../config/types.js';
import menuButtonStyle from '../../scss/menu-button.scss';
import { getEntityTitle, isHassDifferent } from '../../utils/ha';
import { getEntityStateTranslation } from '../../utils/ha/entity-state-translation.js';
import { EntityRegistryManager } from '../../utils/ha/registry/entity/index.js';
import '../icon.js';
import './index.js';

@customElement('advanced-camera-card-submenu-select-button')
export class AdvancedCameraCardSubmenuSelectButton extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @property({ attribute: false })
  public submenuSelect?: MenuSubmenuSelect;

  @property({ attribute: false })
  public entityRegistryManager?: EntityRegistryManager;

  @state()
  protected _optionTitles?: Record<string, string>;

  protected _generatedSubmenu?: MenuSubmenu;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // No need to update the submenu unless the select entity has changed.
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    return (
      !changedProps.has('hass') ||
      !oldHass ||
      !this.submenuSelect ||
      isHassDifferent(this.hass, oldHass, [this.submenuSelect.entity])
    );
  }

  protected async _refreshOptionTitles(): Promise<void> {
    if (!this.hass || !this.submenuSelect) {
      return;
    }
    const entityID = this.submenuSelect.entity;
    const stateObj = this.hass.states[entityID];
    const options = stateObj?.attributes?.options;
    const entity =
      (await this.entityRegistryManager?.getEntity(this.hass, entityID)) ?? null;

    const optionTitles = {};
    for (const option of options) {
      const title = getEntityStateTranslation(this.hass, entityID, {
        ...(entity && { entity: entity }),
        state: option,
      });
      if (title) {
        optionTitles[option] = title;
      }
    }

    // This will cause a re-render with the updated title if it is
    // different.
    this._optionTitles = optionTitles;
  }

  protected willUpdate(): void {
    if (!this.submenuSelect || !this.hass) {
      return;
    }

    if (!this._optionTitles) {
      this._refreshOptionTitles();
    }

    const entityID = this.submenuSelect.entity;
    const stateObj = this.hass.states[entityID];
    const options = stateObj?.attributes?.options;
    if (!stateObj || !options) {
      return;
    }

    const title = getEntityTitle(this.hass, entityID);
    const submenu: MenuSubmenu = {
      ...(title && { title }),

      // Override it with anything explicitly set in the submenuSelect.
      ...this.submenuSelect,

      icon: {
        icon: this.submenuSelect.icon,
        entity: entityID,
        fallback: 'mdi:format-list-bulleted',
      },

      type: 'custom:advanced-camera-card-menu-submenu',
      items: [],
    };

    // For cleanliness remove the options parameter which is unused by the
    // submenu rendering itself (above). It is only in this method to populate
    // the items correctly (below).
    delete submenu['options'];

    const items = submenu.items as MenuSubmenuItem[];

    for (const option of options) {
      const title = this._optionTitles?.[option] ?? option;
      items.push({
        state_color: true,
        selected: stateObj.state === option,
        enabled: true,
        title: title || option,
        ...((entityID.startsWith('select.') || entityID.startsWith('input_select.')) && {
          tap_action: {
            action: 'perform-action',
            perform_action: entityID.startsWith('select.')
              ? 'select.select_option'
              : 'input_select.select_option',
            target: {
              entity_id: entityID,
            },
            data: {
              option: option,
            },
          },
        }),
        // Apply overrides the user may have specified for a given option.
        ...(this.submenuSelect.options && this.submenuSelect.options[option]),
      });
    }

    this._generatedSubmenu = submenu;
  }

  protected render(): TemplateResult {
    const submenu = this._generatedSubmenu;
    if (!submenu) {
      return html``;
    }

    const style = styleMap(submenu.style || {});
    return html` <advanced-camera-card-submenu
      .hass=${this.hass}
      .items=${submenu?.items}
    >
      <ha-icon-button style="${style}" .label=${submenu.title || ''}>
        <advanced-camera-card-icon
          ?allow-override-non-active-styles=${true}
          style="${style}"
          title=${submenu.title || ''}
          .hass=${this.hass}
          .icon=${typeof submenu.icon === 'string'
            ? {
                icon: submenu.icon,
              }
            : submenu.icon}
        ></advanced-camera-card-icon>
      </ha-icon-button>
    </advanced-camera-card-submenu>`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(menuButtonStyle);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'advanced-camera-card-submenu-select-button': AdvancedCameraCardSubmenuSelectButton;
  }
}
