import { GeneralActionConfig } from '../../../config/types';
import { CardActionsAPI } from '../../types';
import { AdvancedCameraCardAction } from './base';

export class MicrophoneUnmuteAction extends AdvancedCameraCardAction<GeneralActionConfig> {
  public async execute(api: CardActionsAPI): Promise<void> {
    await super.execute(api);

    await api.getMicrophoneManager().unmute();
  }
}
