const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Novo dispositivo conectado:', socket.id);

    // Evento para entrar em uma sala (parear dispositivos)
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`Socket ${socket.id} entrou na sala ${roomCode}`);
    });

    // Evento recebido do SENSOR contendo dados de movimento
    socket.on('sensor_data', (data) => {
        // data contém: { room: '123', status: 'ABERTA', value: 15.5 }
        // Envia apenas para quem está na mesma sala (o Monitor)
        socket.to(data.room).emit('update_monitor', data);
    });

    socket.on('disconnect', () => {
        console.log('Dispositivo desconectado');
    });
});


const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});