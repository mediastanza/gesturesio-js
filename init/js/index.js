var GIO = G.IO();

window.onload = function() {
	GIO.init({
		on: 		function() {
			console.log('status: on');
		},
		off: 		function() {
			console.log('status: off');
		},
		onDetect:	function(joint) {
			console.log(joint);
		},
		onFrame:	function(joint) {
			console.log(joint);
		},
		onGesture:	function(gesture) {
			console.log(gesture);
		},
		onClose:	function() {
			console.log('close');
		}
	});
}

window.onresize = GIO.rescale;
