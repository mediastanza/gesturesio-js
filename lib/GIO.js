var d = new Date();
var socketClientId = d.getTime().toString() + Math.round(1000000000*Math.random()).toString();
var messagesQueue = [];
var gIOWindowWidth = 0;
var gIOWindowHeight = 0;
var status = 2;
//users management
var users = [];

//socket management
var socket;

function IONIDataMessage (command,whichJoint,whichCoordinate,whichUser,whichDirection) {
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

function IOServiceMessage (data) {
    this.command = "SERVICE_MESSAGE";
	this.senderId = socketClientId;
    this.data = data;
}

function GIOactivateGestureDetection(whichGesture , whichJoint, whichCoordinate, whichDirection,whichUser) {
	messagesQueue.push(new IONIDataMessage(whichGesture, whichJoint, whichCoordinate , whichUser,whichDirection ));
}
function GIOinhibitGestureDetection(whichGesture , whichJoint, whichCoordinate, whichDirection,whichUser) {
	messagesQueue.push(new IONIDataMessage("stop_" + whichGesture, whichJoint, whichCoordinate , whichUser,whichDirection ));
}
function GIOactivateFilter(whichJoint, whichCoordinate, whichUser) {
	messagesQueue.push(new IONIDataMessage("activateFilter", whichJoint, whichCoordinate, whichUser ));
}
function GIOremoveFilter(whichJoint, whichCoordinate, whichUser) {
	messagesQueue.push(new IONIDataMessage("removeFilter", whichJoint, whichCoordinate, whichUser ));
}
function GIOsendServiceMessage(theObject) {
	messagesQueue.push(new IOServiceMessage(theObject));
}

function connectGIOSocket(ip,port) {
	//socket = new WebSocket("ws://" + ip + ":" + port);
	socket = new WebSocket("ws://localhost:1235/");
	socket.onopen = socketOpenHandler;
	socket.onmessage = socketMessageHandler;
	socket.onclose = socketCloseHandler;
}

function initGIO(width,height,ip,port) {
	if(typeof ip === "undefined") {
        ip = "127.0.0.1";
    }
	if(typeof port === "undefined") {
        port = "1235";
    }
	gIOWindowWidth = width;
	gIOWindowHeight = height;
	connectGIOSocket(ip,port);
}

function rescaleGIO(width,height) {
	gIOWindowWidth = width;
	gIOWindowHeight = height;
}

function socketOpenHandler()
{
	socket.send(JSON.stringify("<policy-file-request/>" + String.fromCharCode(0)));
	status = 0;
}

//signal manager
var GIOSignalsManager = {
  gestureDetected : new signals.Signal(),
  serviceMessageReceived : new signals.Signal()
};
function socketMessageHandler(msg)
{
	status = 0;
	if (messagesQueue.length > 0) {
		for (var i=0;i<messagesQueue.length;i++)
		{ 
			socket.send(JSON.stringify(messagesQueue[i]));
		}
		messagesQueue = [];
	}
	var decoded = JSON.parse(msg.data.replace(/[\u0000\u00ff]/g, ''));
	switch(decoded.command)
	{
		case "SKELETON_UPDATE":
			users = decoded.data;
			if (users.length > 0) {
				status = 1;
			}
			break;
		case "GESTURE":
			gIOSignalsManager.gestureDetected.dispatch(decoded.command, decoded.data); //dispatch signal passing custom parameters
			break;
		case "serviceMessage":
			gIOSignalsManager.serviceMessageReceived.dispatch(decoded.data); //dispatch signal passing custom parameters
			break;
	}
}
function GIOgetJointPosition(whichJoint, whichUser) {
	if(typeof whichUser === "undefined") {
        whichUser = 0;
    }
	var positionXYZ = [0,0,0];
	if (whichUser < users.length)
	{
		for (var i=0;i<users[whichUser].joints.length;i++)
		{ 
			if (users[whichUser].joints[i].name == whichJoint) {
				positionXYZ = [users[whichUser].joints[i].x * gIOWindowWidth,users[whichUser].joints[i].y * gIOWindowHeight,users[whichUser].joints[i].z];
			}
		}
	}
	return positionXYZ;
}
function updateGIOSocket() {	
	var returnVal = "notconnected";
	if (status == 1)
	{
		returnVal = "data";
	}
	else if (status == 0)
	{
		returnVal = "nodata";
	}
	return returnVal;
}
function socketCloseHandler()
{
	status = 2;
	// insert your code here if needed
}