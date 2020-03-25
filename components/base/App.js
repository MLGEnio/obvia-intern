var App = function(_props){
    let _defaultParams = {
        idleInterval: 60000,
        inactivityInterval: 60000,
        components:[],
        historyProps: { enabled: true },
        type: ContainerType.NONE,
    };

    _props = extend(false, false, _defaultParams, _props);
    let _self = this;
    let _idleTime = 0;
    let _idleInterval = _props.idleInterval;
    let _inactivityInterval = _props.inactivityInterval;
    let _style = _props.style;
    let _historyProps = _props.historyProps;
    let _history;

    if(_style)
    {
        $("<style id='"+_self.domID+"_style' type='text/css'>"+_style+"</style>").appendTo("head");
    }

    Object.defineProperty(this, 'history',
    {
        get: function history() {
            return _history;
        }
    });

    let timerIncrement = function () {
        _idleTime = _idleTime + _idleInterval;
        if (_idleTime >= _inactivityInterval) {
            let idleCount = Math.floor(_idleTime / _inactivityInterval);
            _self.trigger("InactivityDetected", [_idleTime, idleCount]);
        }
    };
    let t = setInterval(timerIncrement, _idleInterval); 

    let _visible = true;
    let visibilityEvents = ['visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'msvisibilitychange'];
    visibilityEvents.forEach(function (event){
        window.addEventListener(event, function (event){
            if (document.hidden || document.webkitHidden || document.mozHidden || document.msHidden) {
                if (_visible){
                    _visible = false;
                    _self.trigger("WindowHide", []);
                }
            } else {
                if (!_visible){
                    _visible = true;
                    _self.trigger("WindowShow", []);
                }
            }
        });
    });
    
    let _behaviors = new AutoObject();
    _behaviors[_self.id] = {};
    Object.defineProperty(this, 'behaviors',
    {
        get: function () {
            return _behaviors;
        },
        set: function (v) {
            if (_behaviors != v) { 
                _behaviors = v;
            }
        }
    });
    let _behaviorimplementations = {};
    Object.defineProperty(this, 'behaviorimplementations',
    {
        get: function () {
            return _behaviorimplementations;
        },
        set: function (v) {
            if (_behaviorimplementations != v) { 
                _behaviorimplementations = v;
            }
        }
    });
    
    let _initDefaultBehaviors = function () {
        if (_historyProps.enabled) {
            _history = History.getInstance(".history_" + _self.domID);
            _history.on(HistoryEventType.HISTORY_UNDONE + " " + HistoryEventType.HISTORY_REDONE + " " + HistoryEventType.HISTORY_STEP_ADDED, function (e) {
                _self.trigger(e);
            });
    
            _behaviors[_self.id][HistoryEventType.HISTORY_UNDONE] = "HISTORY_UNDONE";
            _behaviors[_self.id][HistoryEventType.HISTORY_REDONE] = "HISTORY_REDONE";
            _behaviors[_self.id][HistoryEventType.HISTORY_STEP_ADDED] = "HISTORY_STEP_ADDED";
        }
    
        _behaviors[_self.id]['beginDraw'] = "BEGIN_DRAW";
        _behaviors[_self.id]['endDraw'] = "END_DRAW";
        _behaviors[_self.id]['InactivityDetected'] = "APP_INACTIVE";
        _behaviors[_self.id]['ActivityDetected'] = "APP_ACTIVE";
        _behaviors[_self.id]['WindowHide'] = "APP_WINDOW_HIDDEN";
        _behaviors[_self.id]['WindowShow'] = "APP_WINDOW_SHOWN";
        _behaviors[_self.id]['beforeunload'] = "APP_UNLOADED";
        _behaviors[_self.id]['idChanged'] = "UPDATE_BEHAVIOR_BINDINGS";
    };
    _behaviorimplementations["UPDATE_BEHAVIOR_BINDINGS"] = {
        do: function (e) {
            console.log("UPDATE_BEHAVIOR_BINDINGS");
            _behaviors[e.newValue] = _behaviors[e.oldValue];
            delete _behaviors[e.oldValue];
        },
        /**
         * catch events thrown by children
        */
        onPropagation: true
    };

    _behaviorimplementations["BEGIN_DRAW"] = function (e) {
        if (!_loader.attached) 
            _self.$el.append(_loader.render());
        _loader.show();
    };
    //default behavior is to hide loader on endDraw
    _behaviorimplementations["END_DRAW"] = function(e) {
        _loader.hide(); 
    };
    _behaviorimplementations["APP_UNLOADED"] = function(e) {
        //window.open("http://google.com/");
        //return "You have unsaved changes";
        let len = BrowserWindow.all.length;
        for (let i = 0; i < len; i++) { 
            BrowserWindow.all[i].close();
        }
    };
    _behaviorimplementations["APP_INACTIVE"] = function(e, idleTime, idleCount) {
        console.log("App became Inactive, Launch a cool screensaver here");
    };
    _behaviorimplementations["APP_ACTIVE"] = function(e, idleTime, idleCount) {
        console.log("App became Active, Disable screensaver and show login if session expired here");
    };
    _behaviorimplementations["APP_WINDOW_HIDDEN"] = function(e, idleTime, idleCount) {
        console.log("App Window was minimized, you may want to stop network traffic or do sth cpu intensive here.");
    };
    _behaviorimplementations["APP_WINDOW_SHOWN"] = function(e, idleTime, idleCount) {
        console.log("App Window was maximized, you may want to greet the user.");
    };

    let _eventTypes = ["mousedown", "mouseover", "mouseup", "click", "dblclick", "keydown", "keyup", "mousemove", "drop", "dragstart", "dragover", "idChanged", "endDraw"];
    let _eventTypesJoined;
    let _loader = new Loader({ id: 'loader' });
    let _event2behavior = function(e) {
        if(e.type != "InactivityDetected" && e.type != "ActivityDetected" && e.type != "WindowHide" && e.type != "WindowShow"){
            if(_idleTime >= _inactivityInterval){
                let idleCount = Math.floor(_idleTime/_inactivityInterval);
                _self.trigger("ActivityDetected", [_idleTime, idleCount]);
            }
            _idleTime = 0;
        }
        let currentTarget = Component.instances[$(this).attr('id')];
        let target = Component.instances[$(e.target).attr('id')]; 
        let manifestor;

        let cmpBehaviors;
        if(target && !Object.isEmpty(_self.behaviors[target.id]))
        {
            cmpBehaviors = _self.behaviors[target.id];
            manifestor = target;
        }else if(_self.behaviors[currentTarget.id] && _self.behaviors[currentTarget.id][e.type] && _self.behaviorimplementations[_self.behaviors[currentTarget.id][e.type]].onPropagation)
        {
            cmpBehaviors = _self.behaviors[currentTarget.id];
            manifestor = currentTarget;
        }
        
        //console.log(e.type + " " + _idCurrentTarget + " " + _idTarget);
        
        if(cmpBehaviors && cmpBehaviors[e.type]) {
            let behaviorNameArr = [], behaviorFilterArr = [];
            let behaviorName, behaviorFilter;
            let behaviorObj = cmpBehaviors[e.type];

            if(isObject(behaviorObj))
            {
                for(let prop in behaviorObj){
                    behaviorNameArr.push(prop);
                    behaviorFilterArr.push(behaviorObj[prop]);
                }

            }else{
                behaviorNameArr = [behaviorObj];
                behaviorFilterArr = [null];
            }
            
            for(let b=0;b<behaviorNameArr.length;b++)
            {
                behaviorName = behaviorNameArr[b];
                behaviorFilter = behaviorFilterArr[b];

                let behavior = _self.behaviorimplementations[behaviorName];
                let qualifies = true, extraArgs = [];
                if(behavior && typeof behaviorFilter == 'function') {
                    qualifies = behaviorFilter.apply(manifestor, arguments);
                    if(isObject(qualifies)){
                        extraArgs = qualifies.extraArgs;
                        qualifies = qualifies.qualifies;
                    }
                }
                if(behavior && qualifies) {
                    let args = [];
                    for (let i = 0; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }
                    if(extraArgs.length>0){
                        args = args.concat(extraArgs);
                    }

                    if(typeof behavior == 'function') {
                        behavior.apply(manifestor, args);
                    }else{
                        let behavior_implementations = isObject(behavior) && !behavior.forEach?[behavior]:behavior;
                        for(let bi=0;bi<behavior_implementations.length;bi++)
                        {
                            behavior = behavior_implementations[bi];
                            if(isObject(behavior)){
                                let ret = behavior.do.apply(manifestor, args);
                                if(_historyProps.enabled){
                                    _history.track(behavior, behaviorName, ret, manifestor, args);
                                }
                                if(behavior.stopPropagation){
                                    e.stopPropagation();
                                }
                                if(behavior.stopImmediatePropagation){
                                    e.stopImmediatePropagation();
                                }
                                if(behavior.preventDefault){
                                    e.preventDefault();
                                }
                            }else if(typeof behavior == 'function') {
                                behavior.apply(manifestor, args);
                            }
                        }
                    }
                }
            }
        }
    };
    this.endDraw = function (e) {
        if (e.target.id == this.domID) {
            $(window).trigger("endDraw");
        }
    };
    this.beginDraw = function (e) {
        if (e.target.id == this.domID) {
            $(window).trigger("beginDraw");
        }
    };
    this.registerBehaviors = function(win=window)
    {
        //TODO: te bejme difference e oldBehaviors me newBehaviors dhe te shtojme vetem ato si evente per te evituar off dhe on
        if(_eventTypesJoined){
            $(win).off(_eventTypesJoined);
        }
            
        for(let cmpId in _behaviors)
        {
            for(let eventType in _behaviors[cmpId])
            {
                _eventTypes.pushUnique(eventType);
            }
        }
        _eventTypesJoined = _eventTypes.join(" ");
        $(win).on(_eventTypesJoined, _event2behavior);
    };

    let _winWatcher = ChangeWatcher.getInstance(BrowserWindow.all);
    _winWatcher.watch(BrowserWindow.all, "length", function(e){
        if(e.oldValue < e.newValue){
            _self.registerBehaviors(BrowserWindow.all[BrowserWindow.all.length-1].window);

        }
        //
    });

    Object.defineProperty(this, "eventTypes", 
    {
        get: function eventTypes() 
        {
            return _eventTypes;
        }
    });

    Object.defineProperty(this, "idleInterval", 
    {
        get: function idleInterval() 
        {
            return _idleInterval;
        }
    });

    Object.defineProperty(this, "inactivityInterval", 
    {
        get: function inactivityInterval() 
        {
            return _inactivityInterval;
        }
    });

    let r = Container.call(this, _props);
    window.id = _self.domID;
    
    _initDefaultBehaviors();
    this.registerBehaviors();   
    return r;
};
App.prototype.ctor = 'App';