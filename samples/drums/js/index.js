var GIO = G.IO();

window.onload = function() {
	GIO.init($('#Body').width(), $('#Body').height());
	GIO.debug($('#Body').width() + 'x' + $('#Body').height());
	GIO.connect();
	animate();

	function onStatus(statusId, userId){
		switch (statusId) {
			case 1:
				$("#Body").css("background-color", "green");
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
				$("#Body").css("background-color", "red");
				break;
		}
	}
	GIO.signalsManager.statusChanged.add(onStatus);

	function onGesture(command, data){
		GIO.debug(command);
		GIO.debug(data);
		switch (data.whichJoint) {
			case 'left_hand':
				switch (data.whichGesture) {
					case 'swipe':
						switch (data.whichCoordinate) {
							case 'x':
								switch (data.whichDirection) {
									case 1:
										$("#Body").css("background-color", "lightblue");
										break;
									case -1:
										$("#Body").css("background-color", "blue");
										break;
								}
								break;
							case 'y':
								switch (data.whichDirection) {
									case 1:
										$("#Body").css("background-color", "yellow");
										$("#Sounds").append('<audio src="mp3/snare.mp3" autoplay="true"></audio>');
										break;
									case -1:
										$("#Body").css("background-color", "orange");
										$("#Sounds").append('<audio src="mp3/snare.mp3" autoplay="true"></audio>');
										break;
								}
								break;
						}
						break;
				}
			break;
			case 'right_hand':
				switch (data.whichGesture) {
					case 'swipe':
						switch (data.whichCoordinate) {
							case 'x':
								switch (data.whichDirection) {
									case 1:
										$("#Body").css("background-color", "lightgreen");
										break;
									case -1:
										$("#Body").css("background-color", "green");
										break;
								}
								break;
							case 'y':
								switch (data.whichDirection) {
									case 1:
										$("#Body").css("background-color", "pink");
										$("#Sounds").append('<audio src="mp3/kick.mp3" autoplay="true"></audio>');
										break;
									case -1:
										$("#Body").css("background-color", "black");
										$("#Sounds").append('<audio src="mp3/kick.mp3" autoplay="true"></audio>');
										break;
								}
								break;
						}
						break;
				}
			break;
		}
	}
	GIO.signalsManager.gestureDetected.add(onGesture);
}

var skeletonGroups = {};
var skeletonTrackingIDs = [];

function animate() {
	var i, j, user;
	var users = GIO.users;

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
			if ($('#skeleton' + trackingID)) {
				$('#skeleton' + trackingID).remove();
			}
			skeletonGroups[trackingID] = null;
		}
	}

	//reset the tracking IDs
	skeletonTrackingIDs = [];
	for (i = 0; i < users.length; i++) {
		skeleton = users[i];
		//get the skeleton group by it's tracking id
		if(skeletonGroups[skeleton.trackingID] == null) {
			$("#Body").html('<div id="skeleton' + skeleton.trackingID + '">');
			skeletonGroups[skeleton.trackingID] = {};
			for(j = 0; j < skeleton.joints.length; j++) {
				$("#skeleton" + skeleton.trackingID).append('<div class="boxed" id="square_' + skeleton.joints[j].name + '"></div>');
			}
			$("#Body").append('</div>');
		}
		for (var j = 0; j < skeleton.joints.length; j++) {
			$("#square_" + skeleton.joints[j].name).css("top", skeleton.joints[j].y + 'px');
			$("#square_" + skeleton.joints[j].name).css("left", skeleton.joints[j].x + 'px' );
			$("#square_" + skeleton.joints[j].name).css("opacity", skeleton.joints[j].z);
			$("#square_" + skeleton.joints[j].name).css("width", 20+((skeleton.joints[j].z-0.5)*30) + 'px');
			$("#square_" + skeleton.joints[j].name).css("height", 20+((skeleton.joints[j].z-0.5)*30) + 'px' );
		}

	}

	window.requestAnimationFrame( animate );
}



