var GIO = G.IO();

window.onload = function() {
	GIO.init($('body').width(), $('body').height());
	GIO.connect();
	animate();
}

var skeletonGroups = {};
var skeletonTrackingIDs = [];

function animate() {
	var i, j, user;
	var users = GIO.users;

	// Skeleton tracking
	skeletonTrackingIDs = [];
	for (i = 0; i < users.length; i++) {
		skeleton = users[i];

		// get the skeleton group by it's tracking id
		if(skeletonGroups[skeleton.trackingID] == null) {
			skeletonGroups[skeleton.trackingID] = {};

			// HTML at first launch
			$("body").html('');
			$("body").append('<div id="skeleton' + skeleton.trackingID + '">');
			for(j = 0; j < skeleton.joints.length; j++) {
				$("#skeleton" + skeleton.trackingID).append('<div class="boxed" id="square_' + skeleton.joints[j].name + '"></div>');
			}
			$("body").append('</div>');
		}

		// Update on each cycle
		for (var j = 0; j < skeleton.joints.length; j++) {
			$("#square_" + skeleton.joints[j].name).css("top", skeleton.joints[j].y + 'px');
			$("#square_" + skeleton.joints[j].name).css("left", skeleton.joints[j].x + 'px' );
			$("#square_" + skeleton.joints[j].name).css("opacity", skeleton.joints[j].z);
			$("#square_" + skeleton.joints[j].name).css("width", 20+((skeleton.joints[j].z-0.5)*30) + 'px');
			$("#square_" + skeleton.joints[j].name).css("height", 20+((skeleton.joints[j].z-0.5)*30) + 'px' );
		}

	}

	// Remove unused skeletons
	for (i = 0; i < skeletonTrackingIDs.length; i++) {
		var trackingID = skeletonTrackingIDs[i];
		var index = -1;
		for (j = 0; j < users.length; j++) { if (users[j].trackingID == trackingID) { index = j; break; } }
		if (index == -1) { if ($('#skeleton' + trackingID)) { $('#skeleton' + trackingID).remove(); } skeletonGroups[trackingID] = null; }
	}

	window.requestAnimationFrame( animate );
}

