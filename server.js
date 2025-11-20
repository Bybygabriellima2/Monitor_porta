const express = require('express');
const app = express();
const http = require('http').createServer(app);
// Configura o Socket.io aumentando o limite de tamanho para aceitar fotos (10MB)
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e7 
});
const path = require('path');

// Serve os arquivos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Armazena o histórico em memória: { 'SALA1': [{time: '...', msg: '...'}, ...] }
const roomLogs = {}; 

io.on('connection', (socket) => {
    console.log('Novo dispositivo conectado:', socket.id);

    // 1. Entrar na Sala
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        // Se já tem histórico, manda pro Monitor que acabou de entrar
        if (roomLogs[roomCode]) {
            socket.emit('history_data', roomLogs[roomCode]);
        }
    });

    // 2. Receber Dados do Sensor (Movimento)
    socket.on('sensor_data', (data) => {
        // Se a porta abriu, grava no histórico
        if (data.status === 'ABERTA') {
            if (!roomLogs[data.room]) roomLogs[data.room] = [];

            const now = new Date();
            const logEntry = { time: now.toLocaleTimeString('pt-BR'), msg: 'Porta Aberta' };

            // Adiciona no topo da lista e mantém só os últimos 10
            roomLogs[data.room].unshift(logEntry);
            if (roomLogs[data.room].length > 10) roomLogs[data.room].pop();

            // Avisa a todos na sala que houve um novo registro
            io.to(data.room).emit('history_update', logEntry);
        }
        
        // Envia o status (Aberta/Fechada) para o Monitor
        socket.to(data.room).emit('update_monitor', data);
    });

    // 3. Receber Foto 
    socket.on('sensor_photo', (data) => {
        // data = { room: '...', image: 'base64...' }
        // Repassa a foto apenas para quem está na sala (o Monitor)
        socket.to(data.room).emit('update_photo', data.image);
    });

    socket.on('disconnect', () => {
        // Usuário saiu
    });
});

// Porta dinâmica para o Render
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});