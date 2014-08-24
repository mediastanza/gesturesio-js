/**
 * GESTURES.IO - JS Wrapper
 * @version 1.4.4
 * @copyright Gestures.IO
 * @license MIT License
 */

'use strict';
var G = (function () {
	var instance;

	function createInstance() {

		/*
		* Fundamentals
		*/
		var GIO = new Object();
		var domainName = 'localhost';
		var portNumber = 3311;
		var windowW = 800;
		var windowH = 600;
		var statusId = 2;
		GIO.debugLog = true;

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
		function onStatusChanged(statusId, userId){
			GIO.debug('New status: ' + statusId);
			GIO.debug('Data: ' + userId);
		}
		function onGestureDetected(command, data){
			GIO.debug(command + data.whichGesture);
		}
		function onServiceMessageReceived(command, data){
			GIO.debug(command);
		}
		GIO.signalsManager.statusChanged.add(onStatusChanged);
		GIO.signalsManager.gestureDetected.add(onGestureDetected);
		GIO.signalsManager.serviceMessageReceived.add(onServiceMessageReceived);

		// Users management
		GIO.users = [];
		GIO.whichUser = 0;

		/* 
		 * Public functions
		 */
		GIO.init = function (windowWInit, windowHInit, domainNameInit, portNumberInit) {
			domainName = domainNameInit || domainName;
			portNumber = portNumberInit || portNumber;
			windowW = windowWInit || windowW;
			windowH = windowHInit || windowH;
		}
		GIO.rescale = function (windowWInit, windowHInit) {
			windowW = windowWInit;
			windowH = windowHInit;
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
			}
		}

		/* 
		 * Private fuctions
		 */
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
				socket = new WebSocket("ws://" + domainName + ":" + portNumber);
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
									decoded.data[i].joints[j].x = Math.round(100 * decoded.data[i].joints[j].x * windowW) / 100;
									decoded.data[i].joints[j].y = Math.round(100 * decoded.data[i].joints[j].y * windowH) / 100;
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

