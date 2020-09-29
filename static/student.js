let owner;
let repwebSocket;
document.addEventListener('DOMContentLoaded', (event) => {
  //CodeMirror initialization ================================================================================ CodeMirror
  var watchCM = new CodeMirror.fromTextArea(txtareaWatch, {
    mode: "python", //Force python
    theme: "dracula", //Dark mode cause my eyes hurt
    lineNumbers: true, //Essential
    lineWrapping: true, //For mobile
    readOnly: true, 
    foldGutter: {
      rangeFinder: new CodeMirror.fold.combine(
        CodeMirror.fold.brace,
        CodeMirror.fold.comment
      ),
    },
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  });

  var codeCM = new CodeMirror.fromTextArea(txtareaCode, {
    mode: "python", //Force python
    theme: "dracula", //Dark mode cause my eyes hurt
    lineNumbers: true, //Essential
    lineWrapping: true, //For mobile
    cursorBlinkRate: 250, //Higher blink rate = more APM *points to head*
    autoCloseBrackets: true,
    autoCloseTags: true,
    styleActiveLine: true,
    codeFold: true,
    autoHeight: false,
    autoFocus: true,
    imageUpload: false,
    pollInterval: 500,
    foldGutter: {
      rangeFinder: new CodeMirror.fold.combine(
        CodeMirror.fold.brace,
        CodeMirror.fold.comment
      ),
    },
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  });

  watchCM.setSize("100%", "100%");
  codeCM.setSize("100%", "100%");

  // Client, users and repo management
  var consent = true // Student decides if they want to receive code, defaults to yes
  var messageList =  document.getElementById("messages");

  //Created a user object for current student
   owner = new User(uuidv4(), 'You')
   repo = new Repo(owner);

  //WebSocket HTTP/HTTPS houskeeping ================================================================================ WebSocket Setup
  var loc = window.location;
  var wsStart = "ws://";
  if (loc.protocol == "https:") {
    wsStart = "wss://";
  }
  
  //alert(className)// Replace fixed variable with link to class or use loc.pathzname
  var endpoint = wsStart + loc.host + "/ws/broadcast/" + className;

  webSocket = new WebSocket(endpoint);

  //Websocket data package explanation
  //Websockets can send and receive anything. I've created a standardized package for this project.
  var producerPackage = {
    type: "message || code || userdata", // userdata is user ids, names
    payload: "Insert payload here", // Can be objects or plain text
    sender: "user ID", // Used to create a list of users & identify senders
    time: Date.now, // May be used for messages etc.
  };

  //Setting user ID on connection, no idea what I'll use this for
  webSocket.onopen = function (e) {
    webSocket.id = owner.id;
    // Broadcast everytime CodeMirror changes, this means all students are broadcasting even if they don't want to
    codeCM.on("changes", function () {
      temp = codeCM.getValue();
      webSocket.send(
        JSON.stringify({
          type: "share",
          payload: temp,
          sender: owner,
          time: Date.now(),
        })
      );
    });
  };

  //WebSocket consumer ===================================================================================== WebSocket consumer
  webSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    switch (data.type) {
      case "chat_message":
        var messageSent= false;             //Used to check if user is not found & message is not sent
        var dateSent = new Date(data.time); //Converting UNIX timestamp dat
        for (user in repo.userList) {       //Iterating over all users to find senders' name
          if (repo.userList[user].id === data.sender) { //If the ID matches the current user
            let messageItem = document.createElement("li");  //We're putting the time in a span so it can be styled, format [HH:MM] Sender: message
            messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> ${repo.userList[user].name}: ${data.payload}`;
            messageList.appendChild(messageItem); //Add a message to the chat
            messageSent = true;             //Indicate message has been sent & user was found
          }
        }         //If the message was not sent, send with an unknown flag, this needs to be done as users are stored client-side.
        if (!messageSent) {
          let messageItem = document.createElement("li");  
          messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> Unknown: ${data.payload}`;
          messageList.appendChild(messageItem); //Add a message to the chat
        }
        break;    //Either update message producers to include the name in the data package OR store user list server-side
      case "broadcast":
        //Get the students' consent before adding code to their editor
        if (consent) {
          watchCM.setValue(data.payload);
        }
        break;
      case "share":
        console.log(`Sender: ${data.sender.name, data.sender.id}`);
        repo.push(data.sender.id, data.payload);  //Add received code to repo with relevant sender ID
        break;
      case "newUser":
        //Add the user to the repo user list
        if (!(repo.isPresent(data.sender))){  //Check that user ID is not already in the repo, this currently only happens for the repo owner (this client)
          let tempUser = new User(data.sender, data.payload); //Sender is the User ID, payload is their name
          repo.addUser(tempUser);           //Add user to repo
        }

        //Notify chat that a user has joined
        var dateSent = new Date(data.time);
        let messageItem = document.createElement("li");  
        messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> ${data.payload} joined the class!`;
        messageList.appendChild(messageItem);

        //Add the users' name to the attendee list
        var li = document.createElement("li");    
        li.addEventListener("click", function(){ viewCode(`${data.sender}`)}) //Add an onclick to the users' name item with their ID, We use it to pull code from the repo
        li.innerHTML = `<a class="nameItem"> ${data.payload} </a>`;
        document.getElementById("sidebarList").appendChild(li); //Append to sidebar
        break;
      case "review_request": 
        break; //Students don't care about review requests
      default:
        console.log("Unhandled WebSocket event, tell Raza he messed up");
    }
  };
 //TODO Need to add a client-side indicator for user here, such as a reload prompt or loading message
  webSocket.onclose = function (e) {
    webSocket.send(JSON.stringify({
      type: "message",
      payload: `${owner.name} left the class`,
      sender: owner.id,
      time: Date.now(),
    }))
    console.error("Web socket closed unexpectedly"+e);

    console.log("a user has left the class ");
    console.log(e)
  };

  document.querySelector("#chat-message-input").focus();
  document.querySelector("#chat-message-input").onkeyup = function (e) {
    if (e.keyCode === 13) {
      // enter, return
      document.querySelector("#chat-message-submit").click();
    }
  };

  //Sending chat messages to the server
  document.querySelector("#chat-message-submit").onclick = function (e) {
    const messageInputDom = document.querySelector("#chat-message-input");
    const message = messageInputDom.value;
    webSocket.send(
      JSON.stringify({
        type: "message",
        payload: message,
        sender: owner.id,
        time: Date.now(),
      })
    );
    messageInputDom.value = "";//We are not adding messages to the chat locally, the user receives their message via the websocket, and it is then added to chat
  };

  //Sending a request for code review to the teacher
  document.querySelector("#reviewBtn").onclick = function (e) {
    let studentCode = codeCM.getValue();
    webSocket.send(
      JSON.stringify({
        type: "review",
        payload: studentCode,
        sender: owner.id,
        time: Date.now(),
      })
    );
  };

  //Pausing/resuming broadcast by updating consent variable
  document.querySelector("#pauseBtn").onclick = function (e) {
    console.log(consent);
    consent ? (consent = false) : (consent = true);
  };

  // Skulpt ===================================================================================== Skulpt
  function outf(text) {
    var mypre = document.getElementById("output");
    mypre.innerHTML = mypre.innerHTML + "</br>" + text;
  }

  function builtinRead(x) {
    if (
      Sk.builtinFiles === undefined ||
      Sk.builtinFiles["files"][x] === undefined
    )
      throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
  }

  function runit() {  //Checking which editor has focus before getting code 
    var prog = (codeCM.hasFocus() ? codeCM.getValue() : watchCM.getValue());
    var mypre = document.getElementById("output");
    // mypre.innerHTML = '';
    Sk.pre = "output";
    Sk.configure({ output: outf, read: builtinRead, __future__: Sk.python3 });
    var myPromise = Sk.misceval.asyncToPromise(function () {
      return Sk.importMainWithBody("<stdin>", false, prog, true);
    });
    myPromise.then(
      function (mod) {
        console.log("success");
      },
      function (err) {
        console.log(err.toString());
        outf(err.toString());
      }
    );
  }
  // Overriding CTRL+S to run code =================== 
  // document.addEventListener(
  //   "keydown",
  //   function (e) {
  //     e.toString()      
  //     if (e.key !== undefined) {
  //       if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.key == 's') {
  //         e.preventDefault(); //Don't save the page
  //         // Use Skulpt to execute code
  //         runit();
  //       }
  //     }
  //     else(console.log('Undefined key pressed: '+ e.key));
  //   },
  //   false
  // );

  // Modal ===================================================================================== Modal
  const isVisible = "is-visible";
  document.getElementById("nameModal").classList.add(isVisible);

  // Uncomment to let the user dismiss modal with external click
  // document.addEventListener("click", e => {
  // if (e.target == document.querySelector(".modal.is-visible")) {
  //     document.querySelector(".modal.is-visible").classList.remove(isVisible);
  // }
  // });

  //Setting name on submit
  document
    .getElementById("nameSubmitBtn")
    .addEventListener("click", function () {
      owner.name = document.getElementById("nameInput").value;
      document.querySelector(".modal.is-visible").classList.remove(isVisible);
      webSocket.send(
        JSON.stringify({
          type: "userdata",
          payload: owner.name,
          sender: owner.id,
          time: Date.now(),
        })
      );
    });

  //Emulating click on enter press in modal input
  // document.querySelector("#nameInput").onkeyup = function (e) {
  //   if (e.keyCode === 13) {
  //     document.querySelector("#nameSubmitBtn").click(); // enter, return
  //   }
  // };

  //Swapping view code on name click
  function viewCode(id){
    var tempCode = repo.pull(id);
    (tempCode == null ? console.log('Student has not broadcast yet') : watchCM.setValue(tempCode))
  }
});

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

class User {
  constructor(id, name){ 
    this.id = id;
    this.name = name;
    this.code = null;
    this.lastModified = null;
  }
}

class Repo {
  constructor(user) {
    this.userList = [user];
  }

  push(id, code) {
    var pos = null;
    for (var i = 0; i < this.userList.length; i++){
      if (this.userList[i].id == id){
        pos = i;
      }
    }
    // let pos = this.userList.indexOf(user);
    this.userList[pos].code = code;
  }

  pull(id) {
    var pos = null;
    for (var i = 0; i < this.userList.length; i++){
      if (this.userList[i].id == id){
        pos = i;
      }
    }
    // let pos = this.userList.indexOf(user);
    let tempCode = this.userList[pos].code
    return tempCode;
  }

  isPresent(id){
    for (var i = 0; i < this.userList.length; i++){
      if (this.userList[i].id == id){
        return true;
      }
    }
    return false;
  }

  finder(id){
    for (var i = 0; i < this.userList.length; i++){
      if (this.userList[i].id == id){
        return this.userList[i];
      }
    }
    return null;
  }

  addUser(user) {
    this.userList.push(user);
  }
  removeUser(user) {
    this.userList.pop(user);
  }
}
