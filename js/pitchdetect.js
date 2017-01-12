var audioContext = new AudioContext();
var isPlaying = false;    
var isLiveInput = false;
var sourceNode = null;
var gainNode = audioContext.createGain();
var analyser = null;
var theBuffer = null;
var detectorElem, 
	canvasContext,
	pitchElem,
	noteElem,
	detuneElem,
	detuneAmount;
var WIDTH=300;
var CENTER=150;
var HEIGHT=42;
var confidence = 0;
var currentPitch = 0;

function loadSound() {
  theBuffer = null;
  var reader=new FileReader();
  var f=document.getElementById('file').files[0];
  //console.log(f);

  reader.onload=function(e){ //console.log(e.target.result);
    audioContext.decodeAudioData(e.target.result, function(buffer) {
      // when the audio is decoded play the sound
      theBuffer = buffer;
      //playSound(buffer);
    }, onError);
  };
  reader.readAsArrayBuffer(f);
}

function playSound(buffer) {
  sourceNode.buffer = buffer;
  sourceNode.start(0);
}

// log if an error occurs
function onError(e) {
  console.log(e);
}

$(function () { 
  gainNode.gain.value = 0.2;
$('#Gain').spinner().spinner( "value", "0.2" );
$('#Gain').spinner({ 
    min: 0, max: 20,
    spin: function( event, ui ) {var Gain = $( "#Gain" ).spinner( "value" ); gainNode.gain.value = Gain;},
    change: function( event, ui ) {var Gain = $( "#Gain" ).spinner( "value" )*0.2; gainNode.gain.value = Gain;}
}); 
});
      
window.onload = function() {
  var request = new XMLHttpRequest();
  request.open("GET", "sound/peru.wav", true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    audioContext.decodeAudioData( request.response, function(buffer) { 
	   theBuffer = buffer;console.log( "ready to play" );
	   document.getElementsByTagName("button")[0].removeAttribute("disabled");
	 });
  }
  request.send();

	detectorElem = document.getElementById( "detector" );
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	detuneElem = document.getElementById( "detune" );
	detuneAmount = document.getElementById( "detune_amt" );
	canvasContext = document.getElementById( "output" ).getContext("2d");

	/*detectorElem.ondragenter = function () { 
		this.classList.add("droptarget"); 
		return false; 
	};*/
	/*detectorElem.ondragleave = function () { this.classList.remove("droptarget"); return false; };
	detectorElem.ondrop = function (e) {
  		this.classList.remove("droptarget");
  		e.preventDefault();
		theBuffer = null;

	  	var reader = new FileReader();
	  	reader.onload = function (event) { 
	  		audioContext.decodeAudioData( event.target.result, function(buffer) {
	    		theBuffer = buffer;
	  		}, function(){alert("error loading!");} ); 

	  	};
	  	reader.onerror = function (event) {
	  		alert("Error: " + reader.error );
		};
	  	reader.readAsArrayBuffer(e.dataTransfer.files[0]);
	  	return false;
	};*/

}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
	 // Create an AudioNode from the stream.
     mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( gainNode );
    gainNode.connect( analyser );
    analyser.connect( audioContext.destination );
    updatePitch();
	 /*if (isLiveInput) {
	 	isLiveInput = false; 
	 	console.log(stream);
	 	//var audioTrack = stream.getAudioTracks(); 
	 	//stream.removeTrack(audioTrack[0]);
	 	//stream.getAudioTracks()[0].stop(); stream.removeTrack();
	 	console.log(stream.getAudioTracks()[0]); 
	 }
	 else {isLiveInput = true;
	   // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( gainNode );
    gainNode.connect( analyser );
    analyser.connect( audioContext.destination );
    updatePitch();
	 }
    console.log(isLiveInput);*/
}

function toggleLiveInput() {
	 entry.value = "";
	 //obj.val = "";
	 ex1.attr1 = note;
    getUserMedia({audio:true}, gotStream);
}

function togglePlayback() {
    var now = audioContext.currentTime;

    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( now );
        sourceNode = null;
        analyser = null;
        isPlaying = false; //Jazz.MidiOut(0xb0,120,0); 
        JZZ().openMidiOut().send([0xb0,120,0]);
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "start";
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = theBuffer;sourceNode.playbackRate.value = 1.0;
    
    //sourceNode.loop = true;
    
    //gainNode.gain.value = gain; console.log(gain);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    //gainNode.connect( analyser );
    analyser.connect( audioContext.destination );
   // gainNode2.connect( audioContext.destination );
    sourceNode.start( now );
    isPlaying = true;
    isLiveInput = false;
    entry.value = "";
    updatePitch();

    return "stop";
}

var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Uint8Array( buflen );
//var MINVAL = 134;  // 128 == zero.  MINVAL is the "minimum detected signal" level.

//var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69; //console.log(noteNum + ";" + (Math.round( noteNum ) + 69))
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
	return ( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

function autoCorrelate( buf, sampleRate ) {
	var MIN_SAMPLES = 4;	// corresponds to an 11kHz signal
	var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
	var SIZE = 1000;
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;

	confidence = 0;
	currentPitch = 0;

	if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
		return;  // Not enough data

	for (var i=0;i<SIZE;i++) {
		var val = (buf[i] - 128)/128;
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE); // root mean square

	for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<SIZE; i++) {
			correlation += Math.abs(((buf[i] - 128)/128)-((buf[i+offset] - 128)/128));
		}
		correlation = 1 - (correlation/SIZE);
		if (correlation > best_correlation) {
			best_correlation = correlation;
			best_offset = offset;
		}
	}
	if ((rms>0.01)&&(best_correlation > 0.01)) {
		confidence = best_correlation * rms * 10000;
		currentPitch = sampleRate/best_offset;
	// console.log("sampleRate = " + sampleRate + ";   f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
	}
//	var best_frequency = sampleRate/best_offset;
}

var temp = "";
var observe = function(h){
  watch(ex1, function(prop, action, newvalue, oldvalue){
  	 if (temp == "") renderNote(h); //entry.value += h + " ";
  	 if (temp !==newvalue) {
  	 	temp = newvalue;
  	   //console.log(h, newvalue, oldvalue);
      renderNote(temp); //entry.value += temp + " ";
    }
  });
}

var ex1 = {
    attr1: "",
};
 
  function renderNote(note) {
  	 var N = teoria.note.fromMIDI(note);
  	 var Helmholtz = N.helmholtz();
  	 $("#amount").val(note); 
	 JZZ().openMidiOut().send([0xb0,120,0]).send([0xb0,7,$( "#volume" ).spinner( "value" )])
	 JZZ().openMidiOut().send([0x90,note,111])
  	 
    var sign = N.accidental.sign === "x" ? sign = "##" : N.accidental.sign;

    //var _note = N.name + sign + "/"
    var Note = N.name + sign + "/" + N.octave;
    //console.log(Note);
    //console.log(N.octave);
    //oct_num = N.octave + 1;
    //noteElem.innerHTML = _note + Octaves[oct_num];
    noteElem.innerHTML = Helmholtz;
    entry.value += Helmholtz + " ";

    ctx.clearRect(0, 0, 300, 230);
    var stave = new Vex.Flow.Stave(40, 70, 230);
    var clef = N.octave > 3 ? "treble" : "bass";
    stave.addClef(clef).setContext(ctx).draw();
    var voice = new Vex.Flow.Voice({
      num_beats: 1,
      beat_value: 4,
      resolution: Vex.Flow.RESOLUTION
    });    
     
    var StaveNote = new Vex.Flow.StaveNote({ clef: clef, keys: [Note], duration: "q" });
    //keys.forEach(function(d, i){
    	                                   //var sign = accidentals[i];
  	   //console.log(d, i, sign);
  	   if(sign !== "") StaveNote.addAccidental(0, new Vex.Flow.Accidental(sign)); 	   

  voice.addTickables([StaveNote]);
  
  // Format and justify the notes to 300 pixels
  var formatter = new Vex.Flow.Formatter().
  joinVoices([voice]).format([voice], 230);

  // Render voice
  voice.draw(ctx, stave);
} 

function updatePitch( time ) { //console.log(sourceNode.buffer.duration);
//console.log(mediaStreamSource);
	//var cycles = new Array;
	//console.log(analyser);
	if (analyser !== null) analyser.getByteTimeDomainData( buf );

/*
	console.log( 
		"Cycles: " + num_cycles + 
		" - average length: " + sum + 
		" - pitch: " + pitch + "Hz " +
		" - note: " + noteFromPitch( pitch ) +
		" - confidence: " + confidence + "% "
		);
*/
	// possible other approach to confidence: sort the array, take the median; go through the array and compute the average deviation
	autoCorrelate( buf, audioContext.sampleRate );

// 	detectorElem.className = (confidence>50)?"confident":"vague";

	canvasContext.clearRect(0,0,WIDTH,HEIGHT);
                                                 //console.log(confidence);
 	if (confidence <100) { //100
 		detectorElem.className = "vague";
	 	pitchElem.innerText = "--";
		noteElem.innerText = "-";
		detuneElem.className = "";
		detuneAmount.innerText = "--";
		JZZ().openMidiOut().send([0xb0,120,0])
 	} else {
	 	detectorElem.className = "confident";
	 if ( typeof currentPitch !== "NaN" && currentPitch < 3616.8) {
	   pitchElem.innerText = currentPitch ; //pitchElem.innerText = Math.floor( currentPitch ) ;
	 	//console.log(currentPitch + ";" + Math.floor( currentPitch ));
	 	var note =  noteFromPitch( currentPitch );// console.log(note);
	 	//var Note = teoria.note.fromFrequency(currentPitch).note.key()+20; //console.log(teoria.note.fromFrequency(currentPitch)); 
	 	//console.log(note, Note);
	 	//var sequence = [];sequence.push(Note);console.log(time + ";" + sequence);
	 	//var Helmholtz = teoria.note.fromFrequency(currentPitch).note.helmholtz(); 
	 	//var Scientific = teoria.note.fromFrequency(currentPitch).note.scientific();
	 	  
	 	/*var Cents = teoria.note.fromFrequency(currentPitch).cents; //console.log(Cents); 
	 	var MSB = 400/128; var LSB = MSB/128;
	 	var acomma = Math.floor(Cents/MSB); var bcomma = Math.round(Cents%MSB/LSB);*/ //console.log( bcomma + ";" + acomma);			                    

		//$("#amount").val(Note); 
		/*$("#amount").val(note); 
	   JZZ().openMidiOut().send([0xb0,120,0]).send([0xb0,7,$( "#volume" ).spinner( "value" )])
	   JZZ().openMidiOut().send([0x90,note,111])*/
	    
	  //renderNote(note);
	  ex1.attr1 = note;
	  observe(note);

		
		var detune = centsOffFromPitch( currentPitch, note );//console.log(Math.floor(detune));
		/*console.log( 
		" Note: " + Note + ";" + Scientific +
		" note: " + noteStrings[note%12] + 
		" Cents: " + Cents +
		" bcomma: " + bcomma + 
		" acomma: " + acomma + 
		" detune: " + detune 
		);*/
		if (detune == 0 ) {
			detuneElem.className = "";
			detuneAmount.innerHTML = "--";

			// TODO: draw a line.
		} else {
			if (Math.abs(detune)<10)
				canvasContext.fillStyle = "green";
			else
				canvasContext.fillStyle = "red";

			if (detune < 0) {
	  			detuneElem.className = "flat";
			}
			else {
				detuneElem.className = "sharp";
			}
  			canvasContext.fillRect(CENTER, 0, (detune*3), HEIGHT);
			detuneAmount.innerHTML = Math.abs( Math.floor( detune ) );//console.log(detuneAmount.innerHTML + ";" + canvasContext.fillStyle);
		}
	  }
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updatePitch );
}
