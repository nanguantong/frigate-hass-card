import { URLActionConfig } from '../../../config/schema/actions/stock/url';
import { CardActionsAPI } from '../../types';
import { AdvancedCameraCardAction } from './base';

export class URLAction extends AdvancedCameraCardAction<URLActionConfig> {
  public async execute(api: CardActionsAPI): Promise<void> {
    await super.execute(api);

    window.open(this._action.url_path);
  }
}
