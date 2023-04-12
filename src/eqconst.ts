//------------------------------------------------------------------
// This file describes attributes, special keys and constants
//------------------------------------------------------------------

//------------------------------------------------------------------
// Separators
//------------------------------------------------------------------
export const ListSeparator = '|';
export const ListSeparatorOuter = '\t';
export const EventListSeparator1 = '@';
export const EventListSeparator2 = '$';

//------------------------------------------------------------------
// Attributes
//------------------------------------------------------------------
export const AttrEnabled = 'Enabled';
export const AttrChecked = 'Checked';
export const AttrContent = 'Content';
export const AttrTooltip = 'Tooltip';
export const AttrHotkey = 'Hotkey';
export const AttrVisible = 'Visible';
export const AttrSetFocus = 'SetFocus';

export const AttrPosX = 'PosX';
export const AttrPosY = 'PosY';
export const AttrWidth = 'Width';
export const AttrHeight = 'Height';
export const AttrZClass = 'ZClass';
export const AttrMinimized = 'Minimized';
export const AttrOpacity = 'Opacity';
export const AttrBackgroundUseTexture = 'BackgroundUseTexture';
export const AttrBackgroundTintColor = 'BackgroundTintColor';
export const AttrLocked = 'Locked';
export const AttrMovement = 'Movement'; // One-shot "event" for set window Center, Left, Right, Top, Bottom
export const AttrIniState = 'IniState'; // Values for saving to ini

export const AttrText = 'Text';
export const AttrTitle = 'Title';
export const AttrEditMode = 'EditMode';

export const AttrValue = 'Value';
export const AttrMax = 'Max';
export const AttrMin = 'Min';
export const AttrStep = 'Step';

export const AttrImage = 'Image';
export const AttrBackgrImage = 'BackgrImage';
export const AttrQuantity = 'Quantity';
export const AttrChargesEvolving = 'ChargesEvolving';
export const AttrColor = 'Color';
export const AttrCooldownValue = 'CooldownValue'; // 0..1, '' means cooldown is disabled
export const AttrCooldownColor = 'CooldownColor';
export const AttrPowerBarValue = 'PowerBarValue';
export const AttrPowerBarColor = 'PowerBarColor';

export const AttrColumnsWidths = 'ColumnsWidths';
export const AttrChoices = 'Choices';
export const AttrSelected = 'Selected';
export const AttrIndex = 'Index';

//------------------------------------------------------------------
// Special keys
//------------------------------------------------------------------
export const KeySystemUIVisible = 'System.UIVisible'; // Show/hide UI
export const KeySystemUIScale = 'System.UIScale'; // UI scale

export const KeySystemErrorCritical = 'System.Error.Critical';
export const KeySystemErrorWarning = 'System.Error.Warning';

// Key for storing list of keys that C++ can't rewrite, for example, list of window keys stored to Ini
// To add: eq_add_to_cpp_cant_change()
export const KeySystemKeysCppCantChange = 'System.KeysCppCantChange';

// Keys which are requested to be updated from C++ at each frame.
// Typically it's EQType - GAUGE_TYPE and LABEL_TYPE values.
// To subscribe: eq_register_key_sent_each_frame()
// To unsubscribe: eq_unregister_key_sent_each_frame()
export const KeySystemKeysSentEachFrame = 'System.KeysSentEachFrame';

// Note: KeySystemIsMouseOverWindow not used for now, use this: windowManager.isMouseOver
// export const KeySystemIsMouseOverWindow = 'System.IsMouseOverWindow';

// Key names for special elements
export const KeyNameInvSlots = 'InvSlots';
export const KeyNameCursorAttachment = 'CA';

//------------------------------------------------------------------
// Constants
//------------------------------------------------------------------
// Docking
export const DockingRadiusPx = 10; // Sticking in pixels

// Progress bar special values
export const GaugeFullDraw = 'GAUGE_FULL_DRAW';
//------------------------------------------------------------------
// Z-coordinates
//------------------------------------------------------------------
// We need to create 3-level architecture for z coordinates:
// 1. ZClass -20..999 goes from C++ and acts as a layer type.
// 2. Inside a layer we ordering windows,
// 3. Window elements have their own Z.
// So using such constants:
export const ZClassMultiplier = 200000;
export const ZCountMultiplier = 1000;

// Z layers from C++
export const UIZ_BOTTOM = -100;
export const UIZ_WINDOWS = 0; // New layer in JS
export const UIZ_TRADE = 20;
export const UIZ_BAGS = 100;
export const UIZ_CONFIRM = 200;
export const UIZ_DRAGITEM = 300;
export const UIZ_CONTEXTMENU = 800; // New layer in JS
export const UIZ_TIMELEFT = 999; // should be "above" all windows, if on

export const TOOLTIP_RELATIVE_Z = '10000';

//------------------------------------------------------------------
