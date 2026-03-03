/**
 * Central place for Electron main-process constants.
 * Keep global constants here so main.js stays thin and values are easy to find.
 */

/** Backend commands that accept JSON payload via stdin */
const STDIN_COMMANDS = [
  'update-swimmer',
  'delete-swimmers',
  'add-competition',
  'update-competition',
  'duplicate-competition',
  'delete-competitions',
  'add-swimmer',
  'add-team',
  'delete-team',
  'list-swimmers-by-team',
  'bulk-update-team',
  'delete-swimmers-by-team',
  'save-relay-types',
  'reset-database',
  'get-coach',
  'update-coach',
  'set-team-coaches',
];

/** Default window size */
const WINDOW_DEFAULT_WIDTH = 1280;
const WINDOW_DEFAULT_HEIGHT = 800;

/** App data folder name (under APPDATA/HOME) */
const APP_DATA_DIR_NAME = 'relay-team-builder';
const DB_FILENAME = 'swimmers.db';

/** PDF export layout */
const PDF = {
  MARGIN: 50,
  PAGE_WIDTH: 612,
  HEADER_TITLE_Y: 50,
  HEADER_SUB_Y: 78,
  TABLE_ROW_HEIGHT: 20,
  TABLE_FONT_SIZE: 10,
  COL_LEG: 70,
  COL_NAME: 180,
  COL_AGE: 50,
  COL_TIME: 60,
  Y_MAX_FIRST_PAGE: 700,
  Y_MAX_OTHER_PAGES: 680,
  Y_RESET_AFTER_PAGE: 50,
};

/** Medley stroke keys (order: back, breast, fly, free) */
const PDF_STROKE_KEYS = ['backstroke_50', 'breaststroke_50', 'butterfly_50', 'freestyle_50'];

module.exports = {
  STDIN_COMMANDS,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_DEFAULT_HEIGHT,
  APP_DATA_DIR_NAME,
  DB_FILENAME,
  PDF,
  PDF_STROKE_KEYS,
};
