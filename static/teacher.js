let webSocket;
let owner;
let repo;


document.addEventListener('DOMContentLoaded', (event) => {
  var codeCM = new CodeMirror.fromTextArea(txtareaCode, {
    mode: "python", //Force python
    theme: "dracula", //Dark mode cause my eyes hurt
    lineNumbers: true, //Essential
    lineWrapping: true, //For mobile
    cursorBlinkRate: 250, //Higher blink rate = more APM *points to head*
    pollInterval: 600,    //--------------------------------This does not seem to be working
    autoCloseBrackets: true,
    autoCloseTags: true,
    styleActiveLine: true,
    codeFold: true,
    autoHeight: false,
    autoFocus: true,
    imageUpload: false,
    foldGutter: {
      rangeFinder: new CodeMirror.fold.combine(
        CodeMirror.fold.brace,
        CodeMirror.fold.comment
      ),
    },
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  });

  var watchCM = new CodeMirror.fromTextArea(txtareaWatch, {
    mode: "python", //Force python
    theme: "dracula", //Dark mode cause my eyes hurt
    lineNumbers: true, //Essential
    lineWrapping: true, //For mobile
    foldGutter: {
      rangeFinder: new CodeMirror.fold.combine(
        CodeMirror.fold.brace,
        CodeMirror.fold.comment
      ),
    },
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  });

  codeCM.setSize("100%", "100%");
  watchCM.setSize("100%", "100%");

  var messageList =  document.getElementById("messages");
  //WebSocket HTTP/HTTPS houskeeping ================================================================================ WebSocket Setup

  var loc = window.location;
  var wsStart = "ws://";
  if (loc.protocol == "https:") {
    wsStart = "wss://";
  }

  //alert(className)// Replace fixed variable with link to class or use loc.pathname
  var endpoint = wsStart + loc.host + "/ws/broadcast/" + className;
   webSocket = new WebSocket(endpoint);

  //Creating a user object for the teacher & then creating a repo that will store users' code
   owner = new User(uuidv4(), 'You');      //We need to store the user ID in local storage so if they refresh/reconnect other users still have their name/code 
   repo = new Repo(owner);

  //Once the WebSocket connects, do the following
  webSocket.onopen = function (e) {
    // Broadcast everytime CodeMirror changes
    codeCM.on("changes", function () {
      temp = codeCM.getValue();
      webSocket.send(
        JSON.stringify({
          type: "broadcast",
          payload: temp,
          sender: owner.id,
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
        var messageSent = false;             //Used to check if user is not found & message is not sent
        var dateSent = new Date(data.time);  //Converting UNIX timestamp date
        for (user in repo.userList) {        //Iterating over all users to find senders' name
          if (repo.userList[user].id === data.sender) { //If the ID matches the current user
            let messageItem = document.createElement("li");  //We're putting the time in a span so it can be styled, format [HH:MM] Sender: message
            messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> ${repo.userList[user].name}: ${data.payload}`;
            messageList.appendChild(messageItem); //Add a message to the chat
            messageSent = true;              //Indicate message has been sent & user was found
          }
        }
        if (!messageSent) {//If the message was not sent, send with an unknown flag, this needs to be done as users are stored client-side. 
          let messageItem = document.createElement("li");  
          messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> Unknown: ${data.payload}`;
          messageList.appendChild(messageItem); //Add a message to the chat
        }
        break;
      case "review_request": // DEPRECATED SOON™
        //Trigger a review notification
        //We want to add the highlight class to the senders' <li> element
        //Get all the list elements in the attendance list  
        var listArray = Array.from(document.getElementById('sidebarList').children);
        for (item in listArray){      
          if (listArray[item].firstChild.innerText == (repo.finder(data.sender).name)){ //Check if the <a> tag content matches the name of the sender
            listArray[item].classList.add('highlighted');    //If it does, add the highlight class
          }
        }
        break;
      case "newUser":
        //Add the user to the repo user list
        if (!repo.isPresent(data.sender)) {       //Check that user ID is not already in the repo, this currently only happens for the repo owner (this client)
          let tempUser = new User(data.sender, data.payload); //Sender is the User ID, payload is their name
          repo.addUser(tempUser);                //Add user to repo
        }
        //Notify chat that a user has joined
        var dateSent = new Date(data.time);
        let messageItem = document.createElement("li");  
        messageItem.innerHTML = `<span class="timeStamp">[${dateSent.getHours()}:${dateSent.getMinutes()}]</span> ${data.payload} joined the class!`;
        messageList.appendChild(messageItem);
        
        //Add the users' name to the attendee list
        var li = document.createElement("li");   //Add an onclick to the users' name item with their ID
        li.addEventListener("click", function(){ viewCode(`${data.sender}`, this)}) // We use ID to pull code from the repo
        li.innerHTML = `<a class="nameItem"> ${data.payload} </a>`;   //Since the users' name is sent on join, that is the payload
        document.getElementById("sidebarList").appendChild(li);
        break;
      case "broadcast":
        //Do nothing                            //Current design is only one teacher, they don't need to add their code 
        break;
      case "share":
        console.log(`Sender: ${data.sender.name}`);
        repo.push(data.sender.id, data.payload);  //Add received code to repo with relevant sender ID
        break;
      default:
        console.log("Unhandled WebSocket event, tell Raza he messed up");
    }
  };
//TODO Need to add a client-side indicator for user here, such as a reload prompt or loading message
  webSocket.onclose = function (e) {
    webSocket.send(JSON.stringify({
      type: "message",
      payload: `${owner.name} left`,
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
    messageInputDom.value = ""; //We are not adding messages to the chat locally, the user receives their message via the websocket, and it is then added to chat
  };

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

  //Swapping view code on name click
  function viewCode(id, el){
    var tempCode = repo.pull(id);   //Pull the code of the user from the repo
    (tempCode === null || tempCode === undefined ? console.log('Student has not broadcast yet') : watchCM.setValue(tempCode)) //Check that its not invalid before setting it to the watch editor
    el.classList.remove('highlighted');  //Unhighlight the users' name
  }

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

  // Skulpt ================================================================================ Skulpt

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

  function runit() { //Checking which editor has focus before getting code 
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