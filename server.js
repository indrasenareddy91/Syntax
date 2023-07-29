const express = require("express")
const http = require("http")
const path = require("path")
const socketIO = require("socket.io")

const { uuid } = require("uuidv4")
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// serve static files to server
app.use("/public", express.static(path.join(__dirname, "public")))

// Array to store connected users waiting for a partner
let waitingUsers = []
app.get("/", (req, res) => {
 res.sendFile(__dirname + "/index.html")
})
let username
app.post("/chat", (req, res) => {
 username = req.body.username
 if (username) {
  res.sendFile(__dirname + "/chat.html")
 } else {
  res.redirect("/")
 }
})
app.get("/chat", (req, res) => {
 res.redirect("/")
})
io.on("connection", (socket) => {
 var users_online = io.engine.clientsCount
 io.emit("users_online", users_online)
 const user = {
  username,
  socket,
 }
 socket.data = username
 if (waitingUsers.length > 0) {
  const partner = waitingUsers.shift()
  createPrivateChatRoom(partner, user)
 } else {
  waitingUsers.push(user)
  socket.emit("waitMessage", "Waiting for a partner...")
 }

 socket.on("chatMessage", (data) => {
  const { message, room, username, userId } = data
  io.to(userId).emit("chatMessage", { message, room, username })
 })

 socket.on("typing", (data) => {
  const { message, room, username, userId } = data
  console.log(data)
  io.to(userId).emit("texting", { message, room, username })
 })

 socket.on("disconnecting", (reason) => {
  if (socket.rooms.size > 1) {
   for (const room of socket.rooms) {
    if (room !== socket.id) {
     socket.to(room).emit("userDisconnected", socket.data)
    } else {
    }
   }
  } else {
   let shouldPopped = waitingUsers.filter((user) => user.socket !== socket)
   waitingUsers.pop(shouldPopped)
  }
 })
})

function createPrivateChatRoom(user1, user2) {
 const roomName = `privateRoom-${uuid().split("-")[0]}`
 user1.socket.join(roomName)
 user2.socket.join(roomName)

 user1.socket.emit(
  "partnerConnected",
  user2.username,
  roomName,
  user1.username,
  user2.socket.id
 )
 user2.socket.emit(
  "partnerConnected",
  user1.username,
  roomName,
  user2.username,
  user1.socket.id
 )
}

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
 console.log(`Server listening on port ${PORT}`)
})
