/**
 * CSS Selectors for the CALIN V1 GUI interface.
 * Organized by functional area to make maintenance easier.
 */
export const CALIN_SELECTORS = {
  /**
   * Login page selectors
   */
  LOGIN: {
    COMPANY_INPUT: 'input[name=Companyname]',
    USERNAME_INPUT: 'input[name=Username]',
    PASSWORD_INPUT: 'input[name=Password]',
    CAPTCHA_INPUT: 'input[name=verifycode]',
    CAPTCHA_IMAGE: '#valiCode',
    LOGIN_BUTTON: '#Login',
    /** Tab to click after successful login to access the main interface */
    MAIN_TAB: '.tabs-header li.tabs-first > a',
  },

  /**
   * Main accordion navigation menu
   */
  ACCORDION_MENU: {
    /** Meter Management section (3rd panel) - click on header to expand */
    METER_MANAGEMENT_PANEL: '#accordionMenu > div:nth-child(3) > div.panel-header.accordion-header',
  },

  /**
   * Submenu items within accordion panels
   */
  SUBMENU: {
    /** Customer Meter Price - for creating/deleting customer accounts */
    OPEN_AN_ACCOUNT: '#accordionMenu > div:nth-child(1) > div.panel-body.accordion-body > a:nth-child(4)',
    /** Meter New - for adding/removing meters */
    METER_MANAGEMENT: '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(1)',
    /** DCU Meter File - for assigning/unassigning meters to DCUs */
    DCU_METER_FILE: '#accordionMenu > div:nth-child(3) > div.panel-body.accordion-body > a:nth-child(5)',
  },

  DATA_TABLE: {
    FIRST_ROW: '.datagrid-btable tr:first-of-type',
  },

  /**
   * Meter Management Tab (Add/Remove meters)
   */
  METER_MANAGEMENT: {
    FIELDS: {
      METER_ID_FIRST_INPUT: '#METER_ID1',
      METER_ID_SECOND_INPUT: '#REMARK1',
      METER_TYPE_DROPDOWN: '#fmMeterNew1 > div:last-of-type a',
    },
  },

  /**
   * Account Management Tab (Create/delete meter accounts)
   */
  ACCOUNT_MANAGEMENT: {
    FIELDS: {
      /** First dropdown (typically company/area selection) */
      DROPDOWN_CUSTOMER_NO: '#fmCustomerMeterPrice > div:nth-child(2) a',
      /** Second dropdown (typically price plan) */
      DROPDOWN_PRICE_ID: '#fmCustomerMeterPrice > div:nth-child(4) a',
      /** Meter selection dropdown */
      DROPDOWN_METER_NO: '#fmCustomerMeterPrice > div:nth-child(3) a',
    },
    /**
     * Dropdown panel configuration.
     * Multiple panels with class '.panel.combo-p' exist in DOM, but only one is visible at a time.
     * Use clickInVisiblePanel() or getVisiblePanel() helpers to interact with the open dropdown.
     */
    DROPDOWN_PANELS: {
      /** Selector matching all dropdown panels (only one visible at a time) */
      PANEL_SELECTOR: '.panel.combo-p',
      /** First row in a panel's datagrid */
      FIRST_ROW_SELECTOR: '.datagrid-btable tr:first-of-type',
      /** The entire table in a panel */
      TABLE_SELECTOR: '.datagrid-btable',
    },
  },

  /**
   * DCU Meter File Tab (Assign/Unassign meters to DCUs)
   */
  DCU_FILE_MANAGEMENT: {
    FIELDS: {
      /** DCU selection dropdown */
      DCU_DROPDOWN: '#fmDCUMeterFile > div:nth-child(2) a',
      /** Meter selection dropdown */
      METER_DROPDOWN: '#fmDCUMeterFile > div:nth-child(3) a',
      /** Communication protocol dropdown */
      PROTOCOL_DROPDOWN: '#fmDCUMeterFile > div:nth-child(4) a',
      /** Baud rate dropdown */
      BAUD_RATE_DROPDOWN: '#fmDCUMeterFile > div:nth-child(5) a',
    },
  },

  /**
   * Generic UI elements
   */
  COMMON: {
    /** Generic combobox item selector (used with page.evaluate to find by text) */
    COMBOBOX_ITEM: '.combobox-item',
  },

  /**
   * Confirmation dialog selectors
   */
  DIALOG: {
    /** Confirm button in messager dialog */
    CONFIRM_BUTTON: '.messager-button a:first-of-type',
  },
} as const;

/**
 * Names of JavaScript functions available in the CALIN browser context.
 * These are called via page.evaluate() to trigger form submissions and searches.
 */
export const CALIN_BROWSER_FUNCTIONS = {
  /** Add a meter in meter management */
  ADD_METER: 'NewMeterNew',
  /** Add a meter to account management */
  ADD_METER_ACCOUNT: 'NewCustomerMeterPrice',
  /** Add a meter to DCU meter file */
  ADD_METER_TO_DCU_METER_FILE: 'NewDCUMeterFile',
  /** Saves a new meter in meter management */
  SAVE_METER: 'SaveMeterNew1',
  /** Saves a customer meter price record */
  SAVE_CUSTOMER_METER_PRICE: 'SaveCustomerMeterPrice',
  /** Saves a DCU-meter assignment */
  SAVE_DCU_METER_FILE: 'SaveDCUMeterFile',
  /** Searches DCU meter files by meter reference */
  SEARCH_DCU_METER_FILE: 'SearchDCUMeterFile',
  /** Searches customer meter price records by meter reference */
  SEARCH_CUSTOMER_METER_PRICE: 'SearchCustomerMeterPrice',
  /** Searches meters in the Meter New section */
  SEARCH_METER: 'SearchMeterNew',
  /** Deletes selected meter from DCU meter file */
  DELETE_METER_FROM_DCU_METER_FILE: 'DeleteDCUMeterFile',
  /** Deletes selected meter from account management */
  DELETE_METER_ACCOUNT: 'DeleteCustomerMeterPrice',
  /** Deletes selected meter in meter management */
  DELETE_METER: 'DeleteMeterNew',
} as const;

/**
 * Meter phase type display values as shown in the CALIN combobox
 */
export const CALIN_METER_PHASE_VALUES = {
  SINGLE_PHASE: 'Single Phase Meter',
  THREE_PHASE: 'Three Phase Meter',
} as const;

/**
 * Default DCU configuration values
 */
export const CALIN_DCU_CONFIG = {
  /** Communication protocol */
  PROTOCOL: 'LoRa',
  /** Baud rate for communication */
  BAUD_RATE: '9600',
} as const;

/**
 * Timing constants specific to CALIN operations.
 * Note: General Puppeteer timeouts (30s default) are defined in puppeteer-helpers.ts.
 * These are CALIN-specific delays that account for the platform's quirks.
 */
export const CALIN_TIMING = {
  /**
   * Delay after page reload to allow CALIN's JavaScript to fully initialize (ms).
   * CALIN uses EasyUI which needs time to render components after DOM ready.
   */
  POST_RELOAD_SETTLE_MS: 2000,
  /**
   * Delay for CALIN backend to process meter creation before it appears in searches (ms).
   * The meter won't show up in dropdowns/tables immediately after creation.
   */
  METER_PROPAGATION_DELAY_MS: 15000,
} as const;

/**
 * Retry configuration.
 *
 * Note: With the improved Puppeteer helpers (proper waiting, clickability checks),
 * we shouldn't need as many retries as before. The old code had 20 retries to
 * compensate for unreliable sleep-based waiting.
 */
export const CALIN_RETRY_CONFIG = {
  /**
   * Maximum retries for individual steps (2, 3) that don't restart the browser.
   * These should rarely need retries with proper waiting.
   */
  MAX_STEP_RETRIES: 3,
  /**
   * Maximum retries for login attempts (within a single Step 1 attempt).
   * Captcha solving can be unreliable.
   */
  MAX_LOGIN_RETRIES: 3,
  /**
   * Maximum retries for captcha solving service polling.
   */
  MAX_CAPTCHA_RETRIES: 5,
  /**
   * Delay between captcha solution fetch attempts (ms).
   * Most captcha services respond within 5-15 seconds.
   */
  CAPTCHA_FETCH_DELAY_MS: 10000,
} as const;
