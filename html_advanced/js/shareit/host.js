Blob.slice = Blob.slice || Blob.webkitSlice || Blob.mozSlice
if(Blob.slice != undefined)
	alert("It won't work in your browser. Please use Chrome or Firefox.");

// Filereader support (be able to host files from the filesystem)
if(typeof FileReader == "undefined")
	oldBrowser();


var chunksize = 65536

// Holds the STUN server to use for PeerConnections.
var STUN_SERVER = "STUN stun.l.google.com:19302";


function Bitmap(size)
{
  var bitmap = new Array(size)
  for(var i=0; i<size; i++)
    bitmap[i] = i;
  return bitmap
}

function getRandom(bitmap)
{
  return bitmap[Math.floor(Math.random() * bitmap.length)]
}

function remove(bitmap, item)
{
  bitmap.splice(bitmap.indexOf(item), 1)
}


function Host_init(db, signaling, onsuccess)
{
	var host = {}

    // EventTarget interface
    host._events = {};

    host.addEventListener = function(type, listener)
    {
      host._events[type] = host._events[type] || [];
      host._events[type].push(listener);
    };

    host.dispatchEvent = function(type)
    {
      var events = host._events[type];
      if(!events)
        return;

      var args = Array.prototype.slice.call(arguments, 1);

      for(var i = 0, len = events.length; i < len; i++)
        events[i].apply(null, args);
    };

    host.removeEventListener = function(type, listener)
    {
      var events = host._events[type];
      if(!events)
        return;

      events.splice(events.indexOf(listener), 1)

      if(!events.length)
        delete host._events[type]
    };

	if(onsuccess)
		onsuccess(host);

    // Get the channel of one of the peers that have the file from its hash.
    // Since the hash and the tracker system are currently not implemented we'll
    // get just the channel of the peer where we got the file that we added
    // ad-hoc before
    function getChannel(file)
    {
        return file.channel
    }

    host._transferbegin = function(file)
    {
        // Calc number of necesary chunks to download
        var chunks = file.size/chunksize;
        if(chunks % 1 != 0)
            chunks = Math.floor(chunks) + 1;

        // Add a blob container and a bitmap to our file stub
        file.blob = new Blob([''], {"type": file.type})
        file.bitmap = Bitmap(chunks)

        // Insert new "file" inside IndexedDB
        db.sharepoints_add(file,
        function()
        {
            host.dispatchEvent("transfer.begin", file)
            console.log("Transfer begin: '"+file.name+"' = "+JSON.stringify(file))

            // Demand data from the begining of the file
            getChannel(file).emit('transfer.query', file.name,
                                                    getRandom(file.bitmap))
        },
        function(errorCode)
        {
            console.error("Transfer begin: '"+file.name+"' is already in database.")
        })
    }

    host._peers = {}

    function processOffer(pc, sdp, socketId)
    {
        pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(sdp));

        // Send answer
        var answer = pc.createAnswer(pc.remoteDescription.toSdp());

        signaling.emit("answer", socketId, answer.toSdp());

        pc.setLocalDescription(pc.SDP_ANSWER, answer);
    }

    function createPeerConnection()
    {
        var pc = new PeerConnection(STUN_SERVER, function(){});
        host._peers[uid] = pc

        return pc
    }

    function initDataChannel(pc, channel)
    {
		Protocol_init(channel, function(channel)
		{
	        pc._channel = channel

	        Peer_init(channel, db, host)

	        if(onsuccess)
	            onsuccess(channel)
		})
    }

    signaling.addEventListener('connectTo', function(socketId, sdp)
    {
        // Search the peer between the list of currently connected peers
        var pc = host._peers[uid]

        // Peer is not connected, create a new channel
        if(!pc)
        {
		    pc = createPeerConnection();
		    pc.ondatachannel = function(event)
		    {
              initDataChannel(pc, event.channel)
		    }
		}

        processOffer(pc, sdp, socketId)
    })

    signaling.addEventListener('offer', function(socketId, sdp)
    {
        // Search the peer between the list of currently connected peers
        var pc = host._peers[socketId];

        processOffer(pc, sdp, socketId)
    })

    signaling.addEventListener('answer', function(socketId, sdp)
    {
        // Search the peer between the list of currently connected peers
		var pc = host._peers[socketId];

		pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(sdp));
    })

    host.connectTo = function(uid, onsuccess, onerror)
    {
        // Search the peer between the list of currently connected peers
        var peer = host._peers[uid]

        // Peer is not connected, create a new channel
        if(!peer)
        {
            // Create PeerConnection
            var pc = createPeerConnection();
                pc.onopen = function()
                {
			      initDataChannel(pc, pc.createDataChannel())
                }
                pc.onerror = function()
                {
                    if(onerror)
                        onerror()
                }

            // Send offer to new PeerConnection
            var offer = pc.createOffer();

            signaling.emit("connectTo", uid, offer.toSdp());

            pc.setLocalDescription(pc.SDP_OFFER, offer);
        }

        // Peer is connected and we have defined an 'onsucess' callback
        else if(onsuccess)
	        onsuccess(peer._channel)
    }
}