const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

// all code for managing socket connection is run inside 
// as it receives a socket
io.on('connection', (socket) => {
    console.log('We have a new connection.');

    // event managing requests to join a room
    socket.on('join', ({ name, room }, callback) => {
        console.log(name, room);
        const { error, user } = addUser({ id: socket.id, name, room });

        if(error) return callback(error);

        // if no error then welcome user, announce user joins the room 
        // to the rest of users in the room and get it in
        socket.join(user.room);
        socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}`});
        socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined the room`});
        
        // keeping track of users in room
        io.to(user.room).emit('roomData', { room: user.room , users: getUsersInRoom(user.room) });

        callback();  
    });

    // event managing requests from users sending messages
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        // send the message
        io.to(user.room).emit('message', { user: user.name, text: message });
        console.log(message); //
        callback();
    });

    // event managing requests for user disconnection from socket
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        // we inform users about user leaving and keep track of room users
        if(user) {
            io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left!`});
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
            console.log('User has left');
        }       
    })
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
