//------------------------------------------------------------------
// State model for CPP<->JS interconnection
//------------------------------------------------------------------

import { EventMouseOut, EventMouseOver, EventsType, handleEventFromCpp } from './eqevents';
import {
    EventListSeparator1,
    EventListSeparator2,
    KeySystemErrorCritical,
    KeySystemKeysCppCantChange,
    KeySystemKeysSentEachFrame,
    ListSeparator
} from './eqconst';
import { windowManager } from './lib/eq-window-manager';

//------------------------------------------------------------------
export interface EqChangedKey {
    key: string;
    not_notify?: unknown;
}

export interface EqEvent {
    dispatch: string;
    sender: string;
    message: string;
    params?: string;
}

//------------------------------------------------------------------
// EQ - data holder for the model
//------------------------------------------------------------------
class EqClass {
    //constructor() {}

    /** Model
     *
     * The model stores last synced values at last call eq_sync_model\
     * Current changes are stored at
     * @example
     * EqModel["Player.Health"] = {"val": "50", "last_val": "0"};
     */
    Model: Record<string, string> = {}; // @TODO It's not Record, but mutable Object

    // Notificating objects when value was changed
    // Objects must have method object.updated() to receive notification
    Notifications: Record<string, any> = {}; // @TODO It's not pure "Record", but mutable Object
    NotificationsByObject: Record<any, any> = {}; // @TODO It's not pure "Record", but mutable Object

    /**
     * List of write-only keys that are intended to be send to C++ only
     * and can't be read using `eq_eval()`
     */
    WriteOnlyKeys = new Set();

    /** List of transient keys which are not saved on C++ side.
     * Note: TBD, may be this option isn't required at all. */
    TransientKeys = new Set();

    /** Lists of values changes
     *
     * Order is preserved\
     * If `not_notify != null`, the notification will be not sent to `object === not_notify`
     */
    ChangedKeys_: Array<EqChangedKey> = [];

    /** Unordered change list for sending to C++
     *
     * Because it's unordered, it will store the latest change of the same value,
     * which is especially important in case of appending values
     */
    ChangeListCPP_: Record<string, string> = {}; // @TODO It's not Record, but mutable Object

    /** Events list from JS to C++ */
    Events_: Array<EqEvent> = [];

    /** Keys which are requested to be updated from C++ at each frame */
    KeysSentEachFrame_: Record<string, number> = {}; // @TODO It's not Record, but mutable Object
    KeysSentEachFrameWasChanged_ = false;
}

const EQEngine = new EqClass();

export interface BindValueSettings {
    /**
     * If notifyNow is true, object is notified on the next frame
     */
    notifyNow?: boolean;
    transient?: boolean;
    writeOnly?: boolean;
    cppCantChange?: boolean;
}
export class EQ {
    /**
     * Create notification link "{key} -> dependent_object"
     */
    static addNotification(key: string, dependent_object: any) {
        const notif = EQEngine.Notifications;
        const notifByObj = EQEngine.NotificationsByObject;
        if (!notif[key]) {
            notif[key] = new Set();
        }
        if (!notifByObj[dependent_object.item]) {
            notifByObj[dependent_object.item] = new Set();
        }
        notif[key].add(dependent_object);
        notifByObj[dependent_object.item].add(key);
    }

    /**
     * Remove notifications to the given object
     */
    static removeNotifications(dependent_object: any) {
        if (!dependent_object.item) return;
        const item = dependent_object.item;
        const notifByObj = EQEngine.NotificationsByObject;
        if (notifByObj[item]) {
            const keys = notifByObj[item];
            if (keys) {
                const notif = EQEngine.Notifications;
                for (const key of keys) {
                    notif[key].delete(dependent_object);
                }
            }
            notifByObj[item].delete();
        }
    }

    /**
     * Change value and store to CPP changelist.\
     * Called from UI components.\
     * If `sender != null`, the notification will not send to sender
     *
     * | EqType | label-type               |
     * |:------ |:------------------------ |
     * | 1      | LABELTYPE_NAME           |
     * | 2      | LABELTYPE_LEVEL          |
     * | 3      | LABELTYPE_CLASS          |
     * | 4      | LABELTYPE_GOD            |
     * | 5      | LABELTYPE_STR            |
     * | 6      | LABELTYPE_STA            |
     * | 7      | LABELTYPE_DEX            |
     * | 8      | LABELTYPE_AGI            |
     * | 9      | LABELTYPE_WIS            |
     * | 10     | LABELTYPE_INT            |
     * | 11     | LABELTYPE_CHA            |
     * | 12     | LABELTYPE_SVP            |
     * | 13     | LABELTYPE_SVD            |
     * | 14     | LABELTYPE_SVF            |
     * | 15     | LABELTYPE_SVC            |
     * | 16     | LABELTYPE_SVM            |
     * | 17     | LABELTYPE_HP             |
     * | 18     | LABELTYPE_MAXHP          |
     * | 22     | LABELTYPE_MITIGATION     |
     * | 23     | LABELTYPE_OFFENSE        |
     * | 24     | LABELTYPE_WGT            |
     * | 25     | LABELTYPE_MAXWGT         |
     * | 26     | LABELTYPE_EXPPCT         |
     * | 124    | LABELTYPE_MANA           |
     * | 125    | LABELTYPE_MAXMANA        |
     * | 126    | LABELTYPE_ENDURANCE      |
     * | 127    | LABELTYPE_MAXENDURANCE   |
     * | 136    | LABELTYPE_SVCO           |
     * | 211    | LABELTYPE_HASTE          |
     * | 212    | LABELTYPE_HP_REGEN       |
     * | 213    | LABELTYPE_MANA_REGEN     |
     * | 214    | LABELTYPE_END_REGEN      |
     * | 215    | LABELTYPE_SPELL_SHIELD   |
     * | 216    | LABELTYPE_COMBAT_EFF     |
     * | 217    | LABELTYPE_SHIELDING      |
     * | 218    | LABELTYPE_DMG_SHIELDING  |
     * | 219    | LABELTYPE_DOT_SHIELDING  |
     * | 220    | LABELTYPE_DMG_SHIELD_MIT |
     * | 221    | LABELTYPE_ITEM_AVOIDANCE |
     * | 222    | LABELTYPE_ITEM_ACCURACY  |
     * | 223    | LABELTYPE_STUN_RESIST |
     * | 224    | LABELTYPE_STRIKE_THROUGH |
     * | 225    | LABELTYPE_HEAL_AMOUNT |
     * | 226    | LABELTYPE_SPELL_DAMAGE |
     * | 227    | LABELTYPE_CLAIRVOYANCE |
     * | 228    | LABELTYPE_SKILL_DAM_BASH |
     * | 229    | LABELTYPE_SKILL_DAM_BACKSTAB |
     * | 230    | LABELTYPE_SKILL_DAM_DRAGONPUNCH |
     * | 231    | LABELTYPE_SKILL_DAM_EAGLESTRIKE |
     * | 232    | LABELTYPE_SKILL_DAM_FLYINGKICK |
     * | 233    | LABELTYPE_SKILL_DAM_KICK |
     * | 234    | LABELTYPE_SKILL_DAM_ROUNDKICK |
     * | 235    | LABELTYPE_SKILL_DAM_TIGERCLAW |
     * | 236    | LABELTYPE_SKILL_DAM_FRENZY |
     * | 237    | LABELTYPE_WGT_MAXWGT |
     * | 238    | LABELTYPE_BASE_STR       |
     * | 239    | LABELTYPE_BASE_STA       |
     * | 240    | LABELTYPE_BASE_DEX       |
     * | 241    | LABELTYPE_BASE_AGI       |
     * | 242    | LABELTYPE_BASE_WIS       |
     * | 243    | LABELTYPE_BASE_INT       |
     * | 244    | LABELTYPE_BASE_CHA       |
     * | 245    | LABELTYPE_BASE_SVP       |
     * | 246    | LABELTYPE_BASE_SVD       |
     * | 247    | LABELTYPE_BASE_SVF       |
     * | 248    | LABELTYPE_BASE_SVC       |
     * | 249    | LABELTYPE_BASE_SVM       |
     * | 250    | LABELTYPE_BASE_SVCO      |
     * | 251    | LABELTYPE_HEROIC_STR     |
     * | 252    | LABELTYPE_HEROIC_STA     |
     * | 253    | LABELTYPE_HEROIC_DEX     |
     * | 254    | LABELTYPE_HEROIC_AGI     |
     * | 255    | LABELTYPE_HEROIC_WIS     |
     * | 256    | LABELTYPE_HEROIC_INT     |
     * | 257    | LABELTYPE_HEROIC_CHA     |
     * | 264    | LABELTYPE_CAP_STR        |
     * | 265    | LABELTYPE_CAP_STA        |
     * | 266    | LABELTYPE_CAP_DEX        |
     * | 267    | LABELTYPE_CAP_AGI        |
     * | 268    | LABELTYPE_CAP_WIS        |
     * | 269    | LABELTYPE_CAP_INT        |
     * | 270    | LABELTYPE_CAP_CHA        |
     * | 271    | LABELTYPE_CAP_SVP        |
     * | 272    | LABELTYPE_CAP_SVD        |
     * | 273    | LABELTYPE_CAP_SVF        |
     * | 274    | LABELTYPE_CAP_SVC        |
     * | 275    | LABELTYPE_CAP_SVM        |
     * | 276    | LABELTYPE_CAP_SVCO       |
     * | 277    | LABELTYPE_CAP_SPELL_SHIELD |
     * | 278    | LABELTYPE_CAP_COMBAT_EFF |
     * | 279    | LABELTYPE_CAP_SHIELDING |
     * | 280    | LABELTYPE_CAP_DMG_SHIELDING |
     * | 281    | LABELTYPE_CAP_DOT_SHIELDING |
     * | 282    | LABELTYPE_CAP_DMG_SHIELD_MIT |
     * | 283    | LABELTYPE_CAP_ITEM_AVOIDANCE |
     * | 284    | LABELTYPE_CAP_ITEM_ACCURACY |
     * | 285    | LABELTYPE_CAP_STUN_RESIST |
     * | 286    | LABELTYPE_CAP_STRIKE_THROUGH |
     * | 287    | LABELTYPE_CAP_SKILL_DAM_BASH |
     * | 288    | LABELTYPE_CAP_SKILL_DAM_BACKSTAB |
     * | 289    | LABELTYPE_CAP_SKILL_DAM_DRAGONPUNCH |
     * | 290    | LABELTYPE_CAP_SKILL_DAM_EAGLESTRIKE |
     * | 291    | LABELTYPE_CAP_SKILL_DAM_FLYINGKICK |
     * | 292    | LABELTYPE_CAP_SKILL_DAM_KICK |
     * | 293    | LABELTYPE_CAP_SKILL_DAM_ROUNDKICK |
     * | 294    | LABELTYPE_CAP_SKILL_DAM_TIGERCLAW |
     * | 295    | LABELTYPE_CAP_SKILL_DAM_FRENZY |
     * | 335    | LABELTYPE_MERCENARY_AA_EXPERIENCE_PCT |
     * | 336    | LABELTYPE_MERCENARY_AA_POINTS |
     * | 337    | LABELTYPE_MERCENARY_AA_POINTS_SPENT |
     * | 338    | LABELTYPE_MERCENARY_HP |
     * | 339    | LABELTYPE_MERCENARY_MAX_HP |
     * | 340    | LABELTYPE_MERCENARY_MANA |
     * | 341    | LABELTYPE_MERCENARY_MAX_MANA |
     * | 342    | LABELTYPE_MERCENARY_ENDURANCE |
     * | 343    | LABELTYPE_MERCENARY_MAX_ENDURANCE |
     * | 344    | LABELTYPE_MERCENARY_MITIGATION |
     * | 345    | LABELTYPE_MERCENARY_ACCURACY |
     * | 346    | LABELTYPE_MERCENARY_HASTE_PERCENT |
     * | 347    | LABELTYPE_MERCENARY_STRENGTH |
     * | 348    | LABELTYPE_MERCENARY_STAMINA |
     * | 349    | LABELTYPE_MERCENARY_INTELLIGENCE |
     * | 350    | LABELTYPE_MERCENARY_WISDOM |
     * | 351    | LABELTYPE_MERCENARY_AGILITY |
     * | 352    | LABELTYPE_MERCENARY_DEXTERITY |
     * | 353    | LABELTYPE_MERCENARY_CHARISMA |
     * | 354    | LABELTYPE_MERCENARY_COMBAT_HP_REGEN |
     * | 355    | LABELTYPE_MERCENARY_COMBAT_MANA_REGEN |
     * | 356    | LABELTYPE_MERCENARY_COMBAT_ENDURANCE_REGEN |
     * | 357    | LABELTYPE_MERCENARY_HEAL_AMOUNT |
     * | 358    | LABELTYPE_MERCENARY_SPELL_DAMAGE |
     * | 401    | LABELTYPE_VELOCITY       |
     * | 402    | LABELTYPE_ACCURACY       |
     * | 403    | LABELTYPE_EVASION        |
     * | 404    | LABELTYPE_MERCENARY_EVASION |
     * | 405    | LABELTYPE_MERCENARY_OFFENSE |
     * | 406    | LABELTYPE_MERCENARY_HEROIC_STR |
     * | 407    | LABELTYPE_MERCENARY_HEROIC_STA |
     * | 408    | LABELTYPE_MERCENARY_HEROIC_DEX |
     * | 409    | LABELTYPE_MERCENARY_HEROIC_AGI |
     * | 410    | LABELTYPE_MERCENARY_HEROIC_WIS |
     * | 411    | LABELTYPE_MERCENARY_HEROIC_INT |
     * | 412    | LABELTYPE_MERCENARY_HEROIC_CHA |
     * | 413    | LABELTYPE_ITEMOVERFLOW_COUNT |
     * | 414    | LABELTYPE_SPELL13 |
     * | 415    | LABELTYPE_SPELL14 |
     * | 416    | LABELTYPE_LUCK           |
     *
     * | EqType | gauge-type               |
     * |:------ |:------------------------ |
     * | 4      | GAUGETYPE_EXP            |
     */
    static updateValue(key: string, value: string, not_notify: any) {
        if (typeof key !== 'string') {
            console.log('eq_update_value error - bad key, value is', value);
            console.trace();
            return;
        }
        if (typeof value !== 'string') {
            console.log('eq_update_value error - bad value, key is', key);
            console.trace();
            return;
        }

        // Add to change list only if value changed
        if (!this.hasKey(key) || this.getValue(key) !== value) {
            // Immediately apply to JS model
            this.setKeyImmediately(key, value);

            // Store to changelist for sending to C++ and notify JS objects
            this.addToChangelist(key, value);
            this.addToNotificationList(key, not_notify);
        }
    }
    /**
     * Append value by a list with a given separator
     */
    static appendValue(key: string, values: Array<string>, separator: string, not_notify?: any) {
        let v = this.hasKey(key) ? this.getValue(key) : null;
        if (!v || v.length == 0) v = values.join(separator);
        else v += separator + values.join(separator);

        this.updateValue(key, v, not_notify);
    }
    /**
     * Add to the list of values which C++ can't change
     */
    static addToCppCantChange(keys: Array<string>) {
        this.appendValue(KeySystemKeysCppCantChange, keys, ListSeparator);
    }
    /**
     * Print to log ordered keys containing given substring at filter
     * If 'filter' is null, all keys are printed
     * Search is case insensitive
     */
    static printValues(filter?: string) {
        if (filter) filter = filter.toLowerCase();
        console.log('Print keys by filter "' + filter + '"');
        for (const key in EQEngine.Model) {
            if (!filter || key.toLowerCase().includes(filter)) {
                console.log('\t' + key + '\t' + EQEngine.Model[key]);
            }
        }
    }

    /**
     * Initialize value by creating a new key with a given value.
     * If `dependent_object !== null`, then a notification is added to it.
     */
    static bindValue(key: string, value: string, dependent_object: any, settings?: BindValueSettings) {
        if (dependent_object) {
            this.addNotification(key, dependent_object);
        }

        let not_notify = dependent_object;
        if (settings) {
            if (settings.notifyNow) {
                not_notify = null;
            }
            if (settings.writeOnly) EQEngine.WriteOnlyKeys.add(key);
            if (settings.transient) EQEngine.TransientKeys.add(key);
            if (settings.cppCantChange) this.addToCppCantChange([key]);
        }
        if (typeof key !== 'string') {
            console.log('eq_init_value error - bad key, value is', value);
            return;
        }
        if (typeof value !== 'string') {
            console.log('eq_init_value error - bad value, key is', key);
            return;
        }
        // Write default value only if key is unknown
        if (!this.hasKey(key)) {
            this.updateValue(key, value, not_notify);
        }
    }
    /**
     *  Checks if the key exists
     */
    static hasKey(key: string) {
        return Object.prototype.hasOwnProperty.call(EQEngine.Model, key);
    }
    /**
     * Returns the value for a given key
     */
    static getValue(key: string) {
        if (!key) return null;
        if (key.length === 0) return '';
        if (EQEngine.WriteOnlyKeys.has(key)) {
            console.log('Warning at EQ.getValue: key', key, 'is write-only');
            console.trace();
        }
        if (this.hasKey(key)) {
            return EQEngine.Model[key];
        }
        console.log('EQ.getValue error - unknown key ' + key);
        console.trace();
        return '';
    }
    /**
     * Apply changes and dispatch events received from C++
     * changelist: key1,value1,key2,value2,...
     */
    static syncJsModel(changelist: Array<string>) {
        // Apply changes from C++
        if (changelist && changelist.length > 0) {
            const n = changelist.length / 2;
            if (n * 2 !== changelist.length) {
                console.log('Error: changelist from C++ must have even size, but has', changelist.length);
                return;
            }

            for (let i = 0; i < n; i++) {
                const key = changelist[i * 2];
                const value = changelist[i * 2 + 1];
                this.setKeyImmediately(key, value);
                this.addToNotificationList(key, null);
            }
        }

        //  Notify objects subscribed to a given keys
        const Notified = new Set(); // Set of notified objects to eliminate twice notification
        for (const keyRecord of EQEngine.ChangedKeys_) {
            const notif = EQEngine.Notifications[keyRecord.key];
            if (notif) {
                for (const object of notif) {
                    if (!Notified.has(object) && object !== keyRecord.not_notify) {
                        Notified.add(object);
                        if (object.updated) {
                            object.updated();
                        } else {
                            console.log('eq_sync_js_model error: object', object, "has no 'updated' method");
                        }
                    }
                }
            }
        }

        // Clear changed key list
        EQEngine.ChangedKeys_.length = 0;
    }
    /**
     * Apply changes and dispatch events received from C++
     * eventslist: dispatch1, sender1, message1, params1, dispatch2, sender2, message2, params2,
     */
    static syncJsEvents(hostEvents: Array<string>) {
        // Dispatch events from C++
        if (hostEvents && hostEvents.length > 0) {
            const n = hostEvents.length / 4;
            if (n * 4 !== hostEvents.length) {
                console.log('Error: hostEvents from C++ must have size n*4,  but has', hostEvents.length);
                return;
            }

            let k = 0;
            for (let i = 0; i < n; i++) {
                const dispatch = hostEvents[k++];
                const sender = hostEvents[k++];
                const message = hostEvents[k++];
                const params = hostEvents[k++];
                this.handleEvent({ dispatch: dispatch, sender: sender, message: message, params: params });
            }
        }
    }
    /**
     * Add new event to the list
     */
    static sendEvent(dispatch: string, senderKeyPath: string, message: EventsType, params?: string) {
        // We don't logging to console mouseover and mouseout events
        if (message !== EventMouseOver && message !== EventMouseOut) {
            console.log('Event', dispatch, senderKeyPath, message, params);
        }

        EQEngine.Events_.push({
            dispatch: dispatch,
            sender: senderKeyPath,
            message: message,
            params: params || ''
        });
    }
    /**
     * Handles events from C++
     */
    static handleEvent(event: EqEvent) {
        handleEventFromCpp(event);
    }

    /**
     * Send changed values after last sync and new events to CPP\
     * Signal from CPP
     * @TODO instead of this we can immediately send events from JS to C++ and collect them
     */
    static sendNewsToCpp() {
        // Collect changes which we need to send to C++
        this.syncInternal();

        // Collect vars changes
        const changelist = [];
        if (Object.keys(EQEngine.ChangeListCPP_).length > 0) {
            for (const key in EQEngine.ChangeListCPP_) {
                changelist.push(key);
                changelist.push(EQEngine.ChangeListCPP_[key]);
                delete EQEngine.ChangeListCPP_[key]; // Clear change list
            }
        }

        // Collect events
        let eventslist = '';
        if (EQEngine.Events_.length > 0) {
            for (const v of EQEngine.Events_) {
                if (eventslist.length > 0) eventslist += EventListSeparator2;
                eventslist +=
                    v.dispatch! +
                    EventListSeparator1 +
                    v.sender! +
                    EventListSeparator1 +
                    v.message! +
                    EventListSeparator1 +
                    v.params!;
            }
            // console.log('Sent events: ', eventslist);
            // Clear events array
            EQEngine.Events_.length = 0;
        }

        // Send to C++
        this.callCppOnNewsFromJs(changelist, eventslist);
    }
    /**
     * Register key to be updated each frame from C++
     * Maintaining KeysSentEachFrame_ - keys which are requested
     * to be updated from C++ at each frame.
     * Typically it's EQType - GAUGE_TYPE and LABEL_TYPE values.
     */
    static registerKeySentEachFrame(key: string) {
        if (Object.prototype.hasOwnProperty.call(EQEngine.KeysSentEachFrame_, key)) {
            const n = EQEngine.KeysSentEachFrame_[key] + 1;
            EQEngine.KeysSentEachFrame_[key] = n;
        } else {
            EQEngine.KeysSentEachFrame_[key] = 1;
            EQEngine.KeysSentEachFrameWasChanged_ = true;
        }
    }

    /**
     * Unregister key to be updated each frame from C++
     */
    static removeKeySentEachFrame(key: string) {
        if (Object.prototype.hasOwnProperty.call(EQEngine.KeysSentEachFrame_, key)) {
            const n = EQEngine.KeysSentEachFrame_[key] - 1;
            if (n <= 0) {
                delete EQEngine.KeysSentEachFrame_[key];
                EQEngine.KeysSentEachFrameWasChanged_ = true;
            }
        } else {
            console.log("eq_remove_key_sent_each_frame error, can't remove key '" + key + "'");
        }
    }

    /**
     * Update list of keys to be updated each frame from C++
     */
    static updateKeysSentEachFrame() {
        if (EQEngine.KeysSentEachFrameWasChanged_) {
            EQEngine.KeysSentEachFrameWasChanged_ = false;
            const s = Object.keys(EQEngine.KeysSentEachFrame_).join(ListSeparator);
            this.updateValue(KeySystemKeysSentEachFrame, s, null);
        }
    }

    static fail(message: string) {
        console.error('JS critical error:', message);
        this.updateValue(KeySystemErrorCritical, message, null);
    }
    /**
     * "Slow" because needs to generate and pass message, use EQ.fail() instead
     */
    static assertSlow(x: boolean | null, message: string) {
        if (x == null || !x) {
            this.fail(message);
        }
    }

    /**
     * Link C++ functions\
     * __CALL THIS AFTER PAGE IS LOADING AND GAMEFACE IS READY__
     */
    static startup() {
        console.log('');
        console.log('EQ JS starting.');
        console.log(' - To print values use printValues(""), printValues("Invent")');
        console.log(' - To change a value use updateValue("InvSlot23.Quantity","5")');

        // Register values which C++ can't change
        this.addToCppCantChange([KeySystemKeysCppCantChange, KeySystemKeysSentEachFrame]);

        // Register models
        // windowManager.registerModel();

        // Register calls to C++
        this.callCppOnNewsFromJs = function (changelist: Array<string>, eventslist: string) {
            engine.call('cpp_on_news_from_js', changelist, eventslist).then(function () {
                //something after that if required...
            });
        };

        // Register calls from C++
        engine.on('eq_request_js_news', () => {
            this.sendNewsToCpp();
        });

        engine.on('eq_sync_js', (changelist: Array<string>, hostEvents: Array<string>) => {
            this.syncJsModel(changelist);
            this.syncJsEvents(hostEvents);
        });

        // Notify JS is ready to accept C++ data
        // TODO can send known keys here to check with C++

        // *** Set to false for testing without EQ
        const cppEnabled = true;
        if (cppEnabled) {
            engine.call('cpp_js_is_ready');
        } else {
            this.syncJsModel([]);
        }

        // Startup windowManager for scaling UI support
        windowManager.setup();

        // To move window call from C++:
        // std::string posxstr = ToString(posx++ % 100);
        // std::string changelist = "ExtendedTargetWnd.pos_x," + posxstr;
        // m_CohtmlApp->GetView()->TriggerEvent("eq_sync_js", changelist, []);
    }

    /**
     * Immediately set key in the model without registration
     **/
    private static setKeyImmediately(key: string, value: string) {
        if (!key) {
            console.log('eq_set_key_internal error - bad key, value is', value);
            return;
        }
        if (value === null) {
            console.log('eq_set_key_internal error - bad value, key is', value);
            return;
        }
        EQEngine.Model[key] = value;
    }
    /**
     * Utility function, which stores value changing to for JS values.
     * If not_notify != null, the notification will be not send to object === not_notify
     */
    private static addToNotificationList(key: string, not_notify: any) {
        EQEngine.ChangedKeys_.push({ key: key, not_notify: not_notify });
    }
    /**
     * Utility function, which stores value changing to C++ changelist.
     */
    private static addToChangelist(key: string, value: string) {
        EQEngine.ChangeListCPP_[key] = value;
    }
    /**
     * Function called before sending changes to C++.
     * It collect some required information.
     * Called from send_news_to_cpp
     */
    private static syncInternal() {
        // Update keys which are required to be sent from C++ each frame
        this.updateKeysSentEachFrame();
    }
    /**
     * C++ functions
     * C++ backend implementation will be attached to them at eq_startup(), see below
     * Note: we should't delete this function declaration because it be used if no C++ engine
     * Will be connected.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private static callCppOnNewsFromJs(changelist: Array<string>, eventslist: string) {}
}
