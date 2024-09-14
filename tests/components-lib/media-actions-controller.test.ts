import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MicrophoneManagerListenerChange,
  ReadonlyMicrophoneManager,
} from '../../src/card-controller/microphone-manager';
import {
  MediaActionsController,
  MediaActionsControllerOptions,
} from '../../src/components-lib/media-actions-controller';
import { FrigateCardMediaPlayer } from '../../src/types';
import {
  IntersectionObserverMock,
  MutationObserverMock,
  callIntersectionHandler,
  callMutationHandler,
  createParent,
  flushPromises,
} from '../test-utils';
import { callVisibilityHandler, createTestSlideNodes } from '../utils/embla/test-utils';
import { mock } from 'vitest-mock-extended';

const getPlayer = (
  element: HTMLElement,
  selector: string,
): (HTMLElement & FrigateCardMediaPlayer) | null => {
  return element.querySelector(selector);
};

const createPlayer = (): HTMLElement & FrigateCardMediaPlayer => {
  const player = document.createElement('video');

  player['play'] = vi.fn();
  player['pause'] = vi.fn();
  player['mute'] = vi.fn();
  player['unmute'] = vi.fn();
  player['isMuted'] = vi.fn().mockReturnValue(true);
  player['seek'] = vi.fn();
  player['getScreenshotURL'] = vi.fn();
  player['setControls'] = vi.fn();
  player['isPaused'] = vi.fn();

  return player as unknown as HTMLElement & FrigateCardMediaPlayer;
};

const createPlayerSlideNodes = (n = 10): HTMLElement[] => {
  const divs = createTestSlideNodes({ n: n });
  for (const div of divs) {
    div.appendChild(createPlayer());
  }
  return divs;
};

const callMicrophoneListener = (
  microphoneManager: ReadonlyMicrophoneManager,
  action: MicrophoneManagerListenerChange,
  n = 0,
): void => {
  const mock = vi.mocked(microphoneManager.addListener).mock;
  mock.calls[n][0](action);
};

// @vitest-environment jsdom
describe('MediaActionsController', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    vi.stubGlobal('MutationObserver', MutationObserverMock);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('should initialize', () => {
    it('should have root', async () => {
      const controller = new MediaActionsController();

      controller.initialize(createParent());

      expect(controller.hasRoot()).toBeTruthy();
    });

    it('should do nothing without options', async () => {
      const controller = new MediaActionsController();

      const children = createPlayerSlideNodes();
      const parent = createParent({ children: children });

      controller.initialize(parent);
      await controller.select(0);

      expect(getPlayer(children[0], 'video')?.play).not.toBeCalled();
    });

    it('should re-initialize after mutation', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        playerSelector: 'video',
        autoPlayConditions: ['selected' as const],
      });

      const parent = createParent({ children: createPlayerSlideNodes(1) });
      controller.initialize(parent);

      const newPlayer = createPlayer();
      const newChild = document.createElement('div');
      newChild.appendChild(newPlayer);
      parent.append(newChild);

      await callMutationHandler();

      await controller.select(1);

      expect(newPlayer.play).toBeCalled();
    });
  });

  describe('should destroy', () => {
    it('should do nothing after destroy', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        playerSelector: 'video',
        autoPlayConditions: ['selected' as const],
      });

      const children = createPlayerSlideNodes();
      const parent = createParent({ children: children });
      controller.initialize(parent);

      controller.destroy();

      await controller.select(0);

      expect(getPlayer(children[0], 'video')?.play).not.toBeCalled();
    });
  });

  describe('should respond to select', () => {
    it.each([
      ['should play', { autoPlayConditions: ['selected' as const] }, 'play', true],
      ['should not play', { autoPlayConditions: [] }, 'play', false],
      ['should unmute', { autoUnmuteConditions: ['selected' as const] }, 'unmute', true],
      ['should not unmute', { autoUnmuteConditions: [] }, 'unmute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));

        await controller.select(0);

        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );

    it('should not re-select', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        autoPlayConditions: ['selected' as const],
        playerSelector: 'video',
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);
      expect(getPlayer(children[0], 'video')?.play).toBeCalledTimes(1);

      await controller.select(0);
      expect(getPlayer(children[0], 'video')?.play).toBeCalledTimes(1);
    });

    it('should unselect first', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        autoPauseConditions: ['unselected' as const],
        autoMuteConditions: ['unselected' as const],
        playerSelector: 'video',
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);
      await controller.select(1);

      expect(getPlayer(children[0], 'video')?.pause).toBeCalled();
      expect(getPlayer(children[0], 'video')?.mute).toBeCalled();
    });
  });

  describe('should respond to media loaded', () => {
    it('should play', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        autoPlayConditions: ['selected' as const],
        playerSelector: 'video',
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);
      expect(getPlayer(children[0], 'video')?.play).toBeCalledTimes(1);

      getPlayer(children[0], 'video')?.dispatchEvent(
        new Event('frigate-card:media:loaded'),
      );

      await flushPromises();

      expect(getPlayer(children[0], 'video')?.play).toBeCalledTimes(2);
    });

    it('should unmute', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        autoUnmuteConditions: ['selected' as const],
        playerSelector: 'video',
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);
      expect(getPlayer(children[0], 'video')?.unmute).toBeCalledTimes(1);

      getPlayer(children[0], 'video')?.dispatchEvent(
        new Event('frigate-card:media:loaded'),
      );

      await flushPromises();

      expect(getPlayer(children[0], 'video')?.unmute).toBeCalledTimes(2);
    });

    it('should take no action on unselected media load', async () => {
      const controller = new MediaActionsController();
      controller.setOptions({
        autoPlayConditions: ['selected' as const],
        autoUnmuteConditions: ['selected' as const],
        playerSelector: 'video',
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);

      getPlayer(children[9], 'video')?.dispatchEvent(
        new Event('frigate-card:media:loaded'),
      );

      await flushPromises();

      expect(getPlayer(children[9], 'video')?.play).not.toBeCalled();
      expect(getPlayer(children[9], 'video')?.unmute).not.toBeCalled();
    });
  });

  describe('should respond to unselect', () => {
    it.each([
      ['should pause', { autoPauseConditions: ['unselected' as const] }, 'pause', true],
      ['should not pause', { autoPauseConditions: [] }, 'pause', false],
      ['should mute', { autoMuteConditions: ['unselected' as const] }, 'mute', true],
      ['should not mute', { autoMuteConditions: [] }, 'mute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));

        await controller.select(0);
        await controller.unselect();

        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );
  });

  describe('should respond to unselect all', () => {
    it.each([
      ['should pause', { autoPauseConditions: ['unselected' as const] }, 'pause', true],
      ['should not pause', { autoPauseConditions: [] }, 'pause', false],
      ['should mute', { autoMuteConditions: ['unselected' as const] }, 'mute', true],
      ['should not mute', { autoMuteConditions: [] }, 'mute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));

        await controller.unselectAll();

        children.forEach((child) => {
          expect(getPlayer(child, 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
        });
      },
    );
  });

  describe('should respond to page being visible', () => {
    it.each([
      ['should play', { autoPlayConditions: ['visible' as const] }, 'play', true],
      ['should not play', { autoPlayConditions: [] }, 'play', false],
      ['should unmute', { autoUnmuteConditions: ['visible' as const] }, 'unmute', true],
      ['should not unmute', { autoUnmuteConditions: [] }, 'unmute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        vi.spyOn(global.document, 'addEventListener');

        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));
        await controller.select(0);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).not.toBeCalled();

        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        await callVisibilityHandler();

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );
  });

  describe('should respond to page being hiddne', () => {
    beforeAll(() => {
      vi.spyOn(global.document, 'addEventListener');
    });

    it.each([
      ['should pause', { autoPauseConditions: ['hidden' as const] }, 'pause', true],
      ['should not pause', { autoPauseConditions: [] }, 'pause', false],
      ['should mute', { autoMuteConditions: ['hidden' as const] }, 'mute', true],
      ['should not mute', { autoMuteConditions: [] }, 'mute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));
        await controller.select(0);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).not.toBeCalled();

        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
        });
        await callVisibilityHandler();

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );
  });

  describe('should respond to page intersecting with viewport', () => {
    it.each([
      ['should play', { autoPlayConditions: ['visible' as const] }, 'play', true],
      ['should not play', { autoPlayConditions: [] }, 'play', false],
      ['should unmute', { autoUnmuteConditions: ['visible' as const] }, 'unmute', true],
      ['should not unmute', { autoUnmuteConditions: [] }, 'unmute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));
        await controller.select(0);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).not.toBeCalled();

        // There's always a first call to an intersection observer handler. In
        // this case the MediaActionsController ignores it.
        await callIntersectionHandler(false);

        await callIntersectionHandler(true);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );
  });

  describe('should respond to page not intersecting with viewport', () => {
    it.each([
      ['should play', { autoPlayConditions: ['visible' as const] }, 'play', true],
      ['should not play', { autoPlayConditions: [] }, 'play', false],
      ['should unmute', { autoUnmuteConditions: ['visible' as const] }, 'unmute', true],
      ['should not unmute', { autoUnmuteConditions: [] }, 'unmute', false],
    ])(
      '%s',
      async (
        _: string,
        options: Partial<MediaActionsControllerOptions>,
        func: string,
        called: boolean,
      ) => {
        const controller = new MediaActionsController();
        controller.setOptions({
          playerSelector: 'video',
          ...options,
        });

        const children = createPlayerSlideNodes();
        controller.initialize(createParent({ children: children }));
        await controller.select(0);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).not.toBeCalled();

        // There's always a first call to an intersection observer handler. In
        // this case the MediaActionsController ignores it.
        await callIntersectionHandler(false);

        await callIntersectionHandler(true);

        // Not configured to take action on selection.
        expect(getPlayer(children[0], 'video')?.[func]).toBeCalledTimes(called ? 1 : 0);
      },
    );
  });

  describe('should respond to microphone changes', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should unmute when microphone unmuted', async () => {
      const microphoneManager = mock<ReadonlyMicrophoneManager>();
      const controller = new MediaActionsController();

      controller.setOptions({
        autoUnmuteConditions: ['microphone' as const],
        playerSelector: 'video',
        microphoneManager: microphoneManager,
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);

      callMicrophoneListener(microphoneManager, 'unmuted');

      expect(getPlayer(children[0], 'video')?.unmute).toBeCalled();
    });

    it('should re-mute after delay after microphone unmuted', async () => {
      const microphoneManager = mock<ReadonlyMicrophoneManager>();
      const controller = new MediaActionsController();

      controller.setOptions({
        autoMuteConditions: ['microphone' as const],
        playerSelector: 'video',
        microphoneManager: microphoneManager,
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);

      callMicrophoneListener(microphoneManager, 'muted');

      vi.runOnlyPendingTimers();

      expect(getPlayer(children[0], 'video')?.mute).toBeCalled();
    });

    it('should not re-mute after delay after microphone unmuted', async () => {
      const microphoneManager = mock<ReadonlyMicrophoneManager>();
      const controller = new MediaActionsController();

      controller.setOptions({
        autoMuteConditions: [],
        playerSelector: 'video',
        microphoneManager: microphoneManager,
      });

      const children = createPlayerSlideNodes();
      controller.initialize(createParent({ children: children }));

      await controller.select(0);

      callMicrophoneListener(microphoneManager, 'muted');

      vi.runOnlyPendingTimers();

      expect(getPlayer(children[0], 'video')?.mute).not.toBeCalled();
    });
  });
});
