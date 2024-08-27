import {
  CONF_CAMERAS_GLOBAL_IMAGE_REFRESH_SECONDS,
  CONF_CAMERAS_GLOBAL_LIVE_PROVIDER,
  CONF_CAMERAS_GLOBAL_TRIGGERS_OCCUPANCY,
  CONF_LIVE_AUTO_MUTE,
  CONF_LIVE_CONTROLS_THUMBNAILS_MODE,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL,
  CONF_LIVE_CONTROLS_TIMELINE_SHOW_RECORDINGS,
  CONF_LIVE_DRAGGABLE,
  CONF_LIVE_LAZY_UNLOAD,
  CONF_LIVE_SHOW_IMAGE_DURING_LOAD,
  CONF_LIVE_TRANSITION_EFFECT,
  CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL,
  CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL,
  CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL,
  CONF_MEDIA_VIEWER_AUTO_MUTE,
  CONF_MEDIA_VIEWER_AUTO_PAUSE,
  CONF_MEDIA_VIEWER_AUTO_PLAY,
  CONF_MEDIA_VIEWER_CONTROLS_NEXT_PREVIOUS_STYLE,
  CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_MODE,
  CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL,
  CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL,
  CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL,
  CONF_MEDIA_VIEWER_CONTROLS_TIMELINE_SHOW_RECORDINGS,
  CONF_MEDIA_VIEWER_DRAGGABLE,
  CONF_MEDIA_VIEWER_SNAPSHOT_CLICK_PLAYS_CLIP,
  CONF_MEDIA_VIEWER_TRANSITION_EFFECT,
  CONF_MENU_BUTTONS_FRIGATE,
  CONF_MENU_BUTTONS_MEDIA_PLAYER,
  CONF_MENU_BUTTONS_TIMELINE,
  CONF_MENU_STYLE,
  CONF_PERFORMANCE_FEATURES_ANIMATED_PROGRESS_INDICATOR,
  CONF_PERFORMANCE_FEATURES_MAX_SIMULTANEOUS_ENGINE_REQUESTS,
  CONF_PERFORMANCE_FEATURES_MEDIA_CHUNK_SIZE,
  CONF_PERFORMANCE_STYLE_BORDER_RADIUS,
  CONF_PERFORMANCE_STYLE_BOX_SHADOW,
  CONF_STATUS_BAR_STYLE,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_MODE,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL,
  CONF_TIMELINE_SHOW_RECORDINGS,
  CONF_VIEW_TRIGGERS_ACTIONS_TRIGGER,
} from '../../const.js';

export const LOW_PERFORMANCE_PROFILE = {
  // Disable thumbnail carousels.
  [CONF_LIVE_CONTROLS_THUMBNAILS_MODE]: 'none' as const,
  [CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_MODE]: 'none' as const,
  [CONF_TIMELINE_CONTROLS_THUMBNAILS_MODE]: 'none' as const,

  // Do not show recordings on timelines.
  [CONF_LIVE_CONTROLS_TIMELINE_SHOW_RECORDINGS]: false,
  [CONF_MEDIA_VIEWER_CONTROLS_TIMELINE_SHOW_RECORDINGS]: false,
  [CONF_TIMELINE_SHOW_RECORDINGS]: false,

  // Take no automatic media actions.
  [CONF_LIVE_AUTO_MUTE]: 'never' as const,
  [CONF_MEDIA_VIEWER_AUTO_PLAY]: 'never' as const,
  [CONF_MEDIA_VIEWER_AUTO_PAUSE]: 'never' as const,
  [CONF_MEDIA_VIEWER_AUTO_MUTE]: 'never' as const,

  // Always unload resources that are lazily loaded.
  [CONF_LIVE_LAZY_UNLOAD]: 'all' as const,

  // Media carousels do not drag.
  [CONF_LIVE_DRAGGABLE]: false,
  [CONF_MEDIA_VIEWER_DRAGGABLE]: false,

  // Media carousels have no effects.
  [CONF_LIVE_TRANSITION_EFFECT]: 'none' as const,
  [CONF_MEDIA_VIEWER_TRANSITION_EFFECT]: 'none' as const,

  // Do not show image during load.
  [CONF_LIVE_SHOW_IMAGE_DURING_LOAD]: false,

  // Media player next/previous are chevrons.
  [CONF_MEDIA_VIEWER_CONTROLS_NEXT_PREVIOUS_STYLE]: 'chevrons' as const,

  // Disable the status bar.
  [CONF_STATUS_BAR_STYLE]: 'none' as const,

  // Move the menu to outside to remove the need to interact with it with open.
  [CONF_MENU_STYLE]: 'outside',

  // Hide several buttons that are otherwise visible by default.
  [`${CONF_MENU_BUTTONS_FRIGATE}.enabled`]: false,
  [`${CONF_MENU_BUTTONS_TIMELINE}.enabled`]: false,
  [`${CONF_MENU_BUTTONS_TIMELINE}.enabled`]: false,

  // If the media player button is present media player entity fetches are
  // required on initialization.
  [`${CONF_MENU_BUTTONS_MEDIA_PLAYER}.enabled`]: false,

  // Disable all options in thumbnails.
  [CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL]: false,
  [CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL]: false,
  [CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL]: false,
  [CONF_MEDIA_GALLERY_CONTROLS_THUMBNAILS_SHOW_DETAILS]: false,
  [CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL]: false,
  [CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL]: false,
  [CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL]: false,
  [CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DETAILS]: false,
  [CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL]: false,
  [CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL]: false,
  [CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL]: false,
  [CONF_MEDIA_VIEWER_CONTROLS_THUMBNAILS_SHOW_DETAILS]: false,
  [CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DOWNLOAD_CONTROL]: false,
  [CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_FAVORITE_CONTROL]: false,
  [CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_TIMELINE_CONTROL]: false,
  [CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DETAILS]: false,

  // Disable all optional performance related features.
  [CONF_PERFORMANCE_FEATURES_ANIMATED_PROGRESS_INDICATOR]: false,

  // Load fewer media items by default.
  [CONF_PERFORMANCE_FEATURES_MEDIA_CHUNK_SIZE]: 10,

  // Disable all expensive CSS features.
  [CONF_PERFORMANCE_STYLE_BORDER_RADIUS]: false,
  [CONF_PERFORMANCE_STYLE_BOX_SHADOW]: false,

  // Clicking on a snapshot should not play a clip.
  [CONF_MEDIA_VIEWER_SNAPSHOT_CLICK_PLAYS_CLIP]: false,

  [CONF_CAMERAS_GLOBAL_TRIGGERS_OCCUPANCY]: false,
  [CONF_CAMERAS_GLOBAL_LIVE_PROVIDER]: 'image',

  // Refresh the live camera image every 10 seconds (same as stock Home
  // Assistant Picture Glance).
  [CONF_CAMERAS_GLOBAL_IMAGE_REFRESH_SECONDS]: 10,

  // No trigger actions.
  [CONF_VIEW_TRIGGERS_ACTIONS_TRIGGER]: 'none',

  // One engine request at a time.
  [CONF_PERFORMANCE_FEATURES_MAX_SIMULTANEOUS_ENGINE_REQUESTS]: 1,
};
