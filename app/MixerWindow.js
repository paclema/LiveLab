var NUM_INPUTS = 3;
var blendOptions = ["normal", "lighten", "darken", "multiply", "average", "add", "subtract", "divide", "difference", "negation", "exclusion", "screen", "lineardodge", "phoenix", "linearburn", "hue", "saturation", "color", "luminosity", "darkercolor", "lightercolor", "overlay", "softlight", "hardlight", "colordodge", "colorburn", "linearlight", "vividlight", "pinlight", "hardmix", "reflect", "glow"];


var mixerState = {};


function MixerWindow(video, peers, webrtc){
     var ip = window.location.host + window.location.pathname;
      this.createControls(ip, peers);
      showMixer = window.open("https://" + ip + "mixer.html", 'Mixer_'+Math.random()*200, 'popup');
      this.webrtc = webrtc;
      this.video = video;
      this.mixerState = {};
      this.mixerState.effects = [];
      this.streams = {};
      console.log("LOCAL STREAM", webrtc.webrtc.localStreams[0]);
      var str = webrtc.webrtc.localStreams[0];
      this.streams[str.id] = {src: video.src, stream: str, peer_id: "local"};
     this.mixerState.streams = this.streams;
      this.mixerState.sources = [];
      for (var i = 0; i < NUM_INPUTS; i++){
          this.mixerState.sources[i] = {};
      }
      for (peer in peers){
          var src = peers[peer].peerContainer.video.src;
          
          this.streams[peers[peer].peer.stream.id] = {src: peers[peer].peerContainer.video.src, peer_id: peers[peer].peer.id, stream: peers[peer].peer.stream};
      }

       
       this.peers = peers;
      //force relaod because page keeps strange cache
      showMixer.location.reload();
       showMixer.onload = function(){
            for(var i = 0; i < NUM_INPUTS; i++){
              var videoDiv = createVideoDiv(showMixer.document, i, video);
              this.mixerState.sources[i].outputDiv = videoDiv;
              this.mixerState.sources[i].src = videoDiv.src;
            }
             var numVids = 0;
             var event = new CustomEvent('sourcesAdded', {detail: this.mixerState});
             showMixer.document.dispatchEvent(event);
           
             this.showMixer = showMixer;
       }.bind(this);
}

MixerWindow.prototype.mixerEvent = function(type, data){
   var event = new CustomEvent(type, {detail: data});
   this.showMixer.document.dispatchEvent(event);
   console.log("rtc", this.webrtc);
   this.webrtc.sendDirectlyToAll(type, "mixer", data);
   //
}

/*forward remote event to local mixer window */
MixerWindow.prototype.remoteMixerEvent = function(type, data){
  
   var event = new CustomEvent(type, {detail: data});
   this.showMixer.document.dispatchEvent(event);
   //
}

MixerWindow.prototype.updateState = function(){
  console.log(this.mixerState);
  var event = new CustomEvent("updateState", {detail: this.mixerState});
  this.showMixer.document.dispatchEvent(event);
}

MixerWindow.prototype.createControls = function(ip, peers){
  var strWindowFeatures = "height=800,width=400,left=0,toolbar=no,menubar=no,top=0";
  var controls = window.open(
      "https://" + ip + "control.html", 
      'Mixer Controls', 
      strWindowFeatures);

      controls.onload = function(){
      this.controls = controls;
    
        for (var i = 0; i < NUM_INPUTS; i++){
          this.createSourceControl(controls.document, i);
        }
         this.createBlendControl(controls.document, 0, {top: 1, bottom: 0});
         this.createBlendControl(controls.document, 1, {top: 2, bottom: "blend"});
   }.bind(this);
  
}

MixerWindow.prototype.createSourceControl = function(parent, index){
  var controlDiv = addAccordionItem("source"+index, parent.body);
  var sourceOptions = [];
  for(key in this.streams){
    var obj = this.streams[key];
    sourceOptions.push({text: obj.peer_id, value: key});
  }
  var drop = createDropdown("stream: ", controlDiv, index, sourceOptions, function(e, i){
    console.log(e.target.value);
    console.log(this.streams[e.target.value]);
    this.mixerEvent('source', {source: i, stream: e.target.value})
  }.bind(this));
  this.mixerState.sources[index].controlDiv = drop;
}

MixerWindow.prototype.createBlendControl = function(parent, index, sources){
  var blendOpts = blendOptions.map(function(str){
        return {text: str, value: str}
      });
  var blendContainer = addAccordionItem("blend", parent.body);
  var index = this.mixerState.effects.length;
  this.mixerState.effects.push({type: "blend", top: sources.top, bottom: sources.bottom, mode: "multiply"});
   var drop = createDropdown("blend: ", blendContainer , 0, blendOpts, function(e, i){
  
    this.mixerState.effects[index].mode = e.target.value;
  //  this.updateState();
    console.log("CHANGE BLEND", e.target.value);
   this.mixerEvent("blend", {effect: index, mode: e.target.value});
  }.bind(this));
}

function createVideoDiv(parent, index, video){
    var vid =  parent.createElement('video');
    vid.src = video.src;
    vid.id = "source"+index;
    vid.autoplay = true;
    vid.muted = true;
    parent.body.appendChild(vid);
    return vid;
}

function createDropdown(name, parent, index, options, callback){
    var dropDiv = document.createElement('div');
      var dropLabel = document.createElement('label');
      dropLabel.innerHTML = name;
      dropDiv.appendChild(dropLabel);
      var dropSelector = document.createElement('select');
      dropDiv.appendChild(dropSelector);
      for(var i = 0; i < options.length; i++){
         var option = document.createElement('option');
          option.value = options[i].value;
          option.text = options[i].text;
          dropSelector.appendChild(option);
      }
     parent.appendChild(dropDiv);
    dropSelector.addEventListener('change', function(e){
      callback(e, index);
    });
    return dropSelector;
}

function addAccordionItem(name, container){
  var newSection = document.createElement('div');
  newSection.className = "accordion-section closed";
  var divHeader = document.createElement('div');
  divHeader.innerHTML = name;
  divHeader.className = "accordion-header";
  divHeader.onclick = function(e){
    console.log(e.target.parentElement);
    if(e.target.parentElement.className=="accordion-section open"){
      e.target.parentElement.className = "accordion-section closed";
    } else {
      e.target.parentElement.className = "accordion-section open";
    }
  }
  newSection.appendChild(divHeader);
  container.appendChild(newSection);
  var contentDiv = document.createElement("div");
  contentDiv.className = "accordion-content "+ name;
  newSection.appendChild(contentDiv);
  return contentDiv;
}

module.exports = MixerWindow;
