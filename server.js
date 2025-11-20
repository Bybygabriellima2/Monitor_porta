const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 
});
const path = require('path');


app.use(express.static(path.join(__dirname, 'public')));

const roomLogs = {}; 

io.on('connection', (socket) => {
    console.log('Novo dispositivo conectado:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        if (roomLogs[roomCode]) {
            socket.emit('history_data', roomLogs[roomCode]);
        }
    });

    socket.on('sensor_data', (data) => {
        if (data.status === 'ABERTA') {
            if (!roomLogs[data.room]) roomLogs[data.room] = [];

            const now = new Date();
            const logEntry = { time: now.toLocaleTimeString('pt-BR'), msg: 'Porta Aberta' };
            roomLogs[data.room].unshift(logEntry);
            if (roomLogs[data.room].length > 10) roomLogs[data.room].pop();
            io.to(data.room).emit('history_update', logEntry);
        }
        
        socket.to(data.room).emit('update_monitor', data);
    });


    socket.on('sensor_photo', (data) => {
        socket.to(data.room).emit('update_photo', data.image);
    });

    socket.on('disconnect', () => {
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});