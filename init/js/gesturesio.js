/**
 * GESTURES.IO - JS Wrapper
 * @version 2.0.7 (beta)
 * @copyright Gestures.IO
 * @authors @l3dlp, @minerveagape
 * @license MIT License

CHANGES
- init params become object
- new status functions, based on "on" and "off" event
- init() and rescale() "width" and "height" params use by default inner document values
- animate all skeleton joints automatically + callback functions as params
 */

'use strict';
var G = (function () {
	var instance;

	function createInstance() {

		/*
		* Fundamentals
		*/
		var GIO = new Object({ debugLog: false });
		var config = new Object({
			host:   'localhost',
			port:   3311,
			width:  Math.max( document.documentElement.clientWidth,  window.innerWidth  || 0 ),
			height: Math.max( document.documentElement.clientHeight, window.innerHeight || 0 )
		});
		var confix	= new Object({});
		var animateFunctions = {};
		var statusId = 2;

		// Skeleton vars
		var skeletonGroups = {};
		var skeletonTrackingIDs = [];

		// Socket vars
		var socket;
		var d = new Date();
		var socketClientId = d.getTime().toString() + Math.round(1000000000*Math.random()).toString();
		var messagesQueue = [];

		// Signals
		GIO.signalsManager = {
			statusChanged : new signals.Signal(),
			gestureDetected : new signals.Signal(),
			serviceMessageReceived : new signals.Signal()
		};

		// Signals: detected gestures
		function onGestureDetected(command, data){
			animateFunctions.onGesture(data);
		}
		GIO.signalsManager.gestureDetected.add(onGestureDetected);

		// Signals: service message received
		function onServiceMessageReceived(command, data){
			GIO.debug(command);
		}
		GIO.signalsManager.serviceMessageReceived.add(onServiceMessageReceived);

		// Signals: changed status
		function onStatus(statusId, userId){
			GIO.debug('New status: ' + statusId);
			GIO.debug('Data: ' + userId);
			switch (statusId) {
				case 2:
					GIO.statusOff();
					break;
				case 1:
					GIO.statusOn();
					GIO.addGesture('swipe', 'right_hand', 'x', 1, userId);
					GIO.addGesture('swipe', 'right_hand', 'y', 1, userId);
					GIO.addGesture('swipe', 'right_hand', 'x', -1, userId);
					GIO.addGesture('swipe', 'right_hand', 'y', -1, userId);
					GIO.addGesture('swipe', 'left_hand', 'x', 1, userId);
					GIO.addGesture('swipe', 'left_hand', 'y', 1, userId);
					GIO.addGesture('swipe', 'left_hand', 'x', -1, userId);
					GIO.addGesture('swipe', 'left_hand', 'y', -1, userId);
					break;
				case 0:
					GIO.statusOff();
					break;
			}
		}
		GIO.signalsManager.statusChanged.add(onStatus);

		// Users management
		GIO.users = [];
		GIO.whichUser = 0;

		/* 
		 * Public functions
		 */
		GIO.init = function (initObject) {
			animateFunctions.onDetect	= initObject.onDetect	|| function() { GIO.debug('detect'); },
			animateFunctions.onFrame	= initObject.onFrame	|| function() { GIO.debug('frame'); },
			animateFunctions.onGesture	= initObject.onGesture	|| function() { GIO.debug('gesture'); },
			animateFunctions.onClose	= initObject.onClose	|| function() { GIO.debug('close'); }
			config.host   = initObject.host   || config.host;
			config.port   = initObject.port   || config.port;
			config.width  = initObject.width  || config.width;
			config.height = initObject.height || config.height;
			confix.width  = initObject.width  || false;
			confix.height = initObject.height || false;
			GIO.statusOn = initObject.on;
			GIO.statusOff = initObject.off;
			GIO.debug('New load on screen res: ' + config.width + 'x' + config.height);
			GIO.connect();
			GIO.animate();
		}
		GIO.rescale = function () {
			config.width  = confix.width  || Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
			config.height = confix.height || Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			GIO.debug('Changed screen res: ' + config.width + 'x' + config.height);
		}
		GIO.status = function() {
			return statusId;
		}
		GIO.connect = function() {
			try {
				socketConnect();
			}
			catch (exception) {
				GIO.debug("connect() Error: " + exception);
				GIO.init();
			}
			return false;
		}
		GIO.addGesture = function (whichGesture , whichJoint, whichCoordinate, whichDirection,whichUser) {
			messagesQueue.push(new GIODataMessage(whichGesture, whichJoint, whichCoordinate , whichUser,whichDirection ));
		}
		GIO.removeGesture = function (whichGesture , whichJoint, whichCoordinate, whichDirection,whichUser) {
			messagesQueue.push(new GIODataMessage("stop_" + whichGesture, whichJoint, whichCoordinate , whichUser,whichDirection ));
		}
		GIO.addFilter = function (whichJoint, whichCoordinate, whichUser) {
			messagesQueue.push(new GIODataMessage("addFilter", whichJoint, whichCoordinate, whichUser ));
		}
		GIO.removeFilter = function (whichJoint, whichCoordinate, whichUser) {
			messagesQueue.push(new GIODataMessage("removeFilter", whichJoint, whichCoordinate, whichUser ));
		}
		GIO.sendServiceMessage = function (theObject) {
			messagesQueue.push(new GIOServiceMessage(theObject));
		}
		GIO.debug = function(data) {
			if (GIO.debugLog && data !== undefined) {
				console.log(data);
			} else {
				/*
				var r = new XMLHttpRequest();
				r.open("POST", "path/to/api", true);
				r.onreadystatechange = function () {
					  if (r.readyState != 4 || r.status != 200) return;
					    alert("Success: " + r.responseText);
				};
				r.send("banana=yellow");
				*/
			}
		}

		GIO.animate = function() {
			var i, j, user, skeleton;
			var users = getUsers();
			var skeletonGroups = {};
			var skeletonTrackingIDs = [];

			//remove the users which are no longer there
			for (i = 0; i < skeletonTrackingIDs.length; i++) {
				var trackingID = skeletonTrackingIDs[i];
				var index = -1;
				for (j = 0; j < users.length; j++) {
					if (users[j].trackingID == trackingID) {
						index = j;
						break;
					}
				}
				if (index == -1) {
					skeletonGroups[trackingID] = null;
				}
			}

			//reset the tracking IDs
			skeletonTrackingIDs = [];
			for (i = 0; i < users.length; i++) {
				skeleton = users[i];
				//get the skeleton group by it's tracking id
				if(skeletonGroups[skeleton.trackingID] == null) {
					skeletonGroups[skeleton.trackingID] = {};
					for (var i = 0; i < skeleton.joints.length; i++) {
						animateFunctions.onDetect(skeleton.joints[i]);
					}
				}
				for (var j = 0; j < skeleton.joints.length; j++) {
					animateFunctions.onFrame(skeleton.joints[j]);
				}

			}

			window.requestAnimationFrame( GIO.animate );
		}



		/* 
		 * Private fuctions
		 */
		function getUsers() {
			return GIO.users;
		}
		function GIODataMessage (command,whichJoint,whichCoordinate,whichUser,whichDirection) {
			this.command = command;
			this.senderId = socketClientId;
			whichUser = whichUser || 0; // in case whichUser is not defined
			this.data = {
				joint: whichJoint,
				coordinate: whichCoordinate,
				direction: whichDirection,
				user: whichUser
			};
		}
		function GIOServiceMessage (data) {
			this.command = "SERVICE_MESSAGE";
			this.senderId = socketClientId;
			this.data = data;
		}
		function socketConnect () {
			try {
				socket = new WebSocket("ws://" + config.host + ":" + config.port);
				socket.onopen = socketOpenHandler;
				socket.onmessage = socketMessageHandler;
				socket.onclose = socketCloseHandler;
				socket.onerror = function (error) {
					GIO.debug('WebSocket Error: ' + error);
				};
			}
			catch (exception) {
				GIO.debug("socketConnect() Error: " + exception);
			}
			return false;
		}
		function socketOpenHandler () {
			try {
				socket.send(JSON.stringify("<policy-file-request/>" + String.fromCharCode(0)));
			}
			catch (exception) {
				GIO.debug("socketOpenHandler() Error: " + exception);
			}
			return false;
		}
		function socketMessageHandler (msg) {
			try {
				/*
				if (messagesQueue.length > 0) {
					var message;
					while (message = messagesQueue.pop()){ 
						var jsonTmp = JSON.stringify(message);
						socket.send(jsonTmp);
					}
				}
				*/
				if (messagesQueue.length > 0) {
					var message = messagesQueue.pop();
					var jsonTmp = JSON.stringify(message);
					socket.send(jsonTmp);
				}
				
				var decoded = JSON.parse(msg.data.replace(/[\u0000\u00ff]/g, ''));
				var tempStatus = statusId;
				switch(decoded.command) {
					case "SKELETON_UPDATE":
						var tempDump = decoded.data;
						if (decoded.data.length > 0) {
							statusId = 1;
							var i, j;
							for (i = 0; i < decoded.data.length; i++) {
								for (j = 0; j < decoded.data[i].joints.length; j++) {
									decoded.data[i].joints[j].x = Math.round(100 * decoded.data[i].joints[j].x * config.width) / 100;
									decoded.data[i].joints[j].y = Math.round(100 * decoded.data[i].joints[j].y * config.height) / 100;
									decoded.data[i].joints[j].z = 2 - decoded.data[i].joints[j].z;
								}
							}
						} else {
							statusId = 0;
						}
						GIO.users = decoded.data;
						break;
					case "GESTURE":
						GIO.signalsManager.gestureDetected.dispatch(decoded.command, decoded.data); //dispatch signal passing custom parameters
						break;
					case "serviceMessage":
						GIO.signalsManager.serviceMessageReceived.dispatch(decoded.data); //dispatch signal passing custom parameters
						break;
				}
				if (tempStatus != statusId) {
					GIO.signalsManager.statusChanged.dispatch(statusId, GIO.whichUser);
				}
			}
			catch (exception) {
				GIO.debug("socketMessageHandler() Error: " + exception);
			}
			return false;
		}
		function socketCloseHandler () {
			try {
				GIO.connect();
			}
			catch (exception) {
				GIO.debug("socketCloseHandler() Error: " + exception);
			}
			return false;
		}
		
		/* 
		 * return Object;
		 */
		return GIO;
	}

	return {
	/*
	* Singleton Instance of GIO
	*/
		IO: function () {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		}
	};
})();

/** @license
 * JS Signals <http://millermedeiros.github.com/js-signals/>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 1.0.0 - Build: 268 (2012/11/29 05:48 PM)
 */

(function(m){function g(a,c,d,e,b){this._listener=c;this._isOnce=d;this.context=e;this._signal=a;this._priority=b||0}function l(a,c){if("function"!==typeof a)throw Error("listener is a required param of {fn}() and should be a Function.".replace("{fn}",c));}function k(){this._bindings=[];this._prevParams=null;var a=this;this.dispatch=function(){k.prototype.dispatch.apply(a,arguments)}}g.prototype={active:!0,params:null,execute:function(a){var c;this.active&&this._listener&&(a=this.params?this.params.concat(a):
a,c=this._listener.apply(this.context,a),this._isOnce&&this.detach());return c},detach:function(){return this.isBound()?this._signal.remove(this._listener,this.context):null},isBound:function(){return!!this._signal&&!!this._listener},isOnce:function(){return this._isOnce},getListener:function(){return this._listener},getSignal:function(){return this._signal},_destroy:function(){delete this._signal;delete this._listener;delete this.context},toString:function(){return"[SignalBinding isOnce:"+this._isOnce+
", isBound:"+this.isBound()+", active:"+this.active+"]"}};k.prototype={VERSION:"1.0.0",memorize:!1,_shouldPropagate:!0,active:!0,_registerListener:function(a,c,d,e){var b=this._indexOfListener(a,d);if(-1!==b){if(a=this._bindings[b],a.isOnce()!==c)throw Error("You cannot add"+(c?"":"Once")+"() then add"+(c?"Once":"")+"() the same listener without removing the relationship first.");}else a=new g(this,a,c,d,e),this._addBinding(a);this.memorize&&this._prevParams&&a.execute(this._prevParams);return a},
_addBinding:function(a){var c=this._bindings.length;do--c;while(this._bindings[c]&&a._priority<=this._bindings[c]._priority);this._bindings.splice(c+1,0,a)},_indexOfListener:function(a,c){for(var d=this._bindings.length,e;d--;)if(e=this._bindings[d],e._listener===a&&e.context===c)return d;return-1},has:function(a,c){return-1!==this._indexOfListener(a,c)},add:function(a,c,d){l(a,"add");return this._registerListener(a,!1,c,d)},addOnce:function(a,c,d){l(a,"addOnce");return this._registerListener(a,!0,
c,d)},remove:function(a,c){l(a,"remove");var d=this._indexOfListener(a,c);-1!==d&&(this._bindings[d]._destroy(),this._bindings.splice(d,1));return a},removeAll:function(){for(var a=this._bindings.length;a--;)this._bindings[a]._destroy();this._bindings.length=0},getNumListeners:function(){return this._bindings.length},halt:function(){this._shouldPropagate=!1},dispatch:function(a){if(this.active){var c=Array.prototype.slice.call(arguments),d=this._bindings.length,e;this.memorize&&(this._prevParams=
c);if(d){e=this._bindings.slice();this._shouldPropagate=!0;do d--;while(e[d]&&this._shouldPropagate&&!1!==e[d].execute(c))}}},forget:function(){this._prevParams=null},dispose:function(){this.removeAll();delete this._bindings;delete this._prevParams},toString:function(){return"[Signal active:"+this.active+" numListeners:"+this.getNumListeners()+"]"}};k.Signal=k;"function"===typeof define&&define.amd?define(function(){return k}):"undefined"!==typeof module&&module.exports?module.exports=k:m.signals=
k})(this);
