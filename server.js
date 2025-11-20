const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// Armazena o histórico em memória: { 'SALA1': [{time: '...', status: '...'}, ...] }
const roomLogs = {}; 

io.on('connection', (socket) => {
    console.log('Novo dispositivo:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        
        // Se já existir histórico dessa sala, envia para quem acabou de entrar (o Monitor)
        if (roomLogs[roomCode]) {
            socket.emit('history_data', roomLogs[roomCode]);
        }
    });

    socket.on('sensor_data', (data) => {
        // Apenas registramos no histórico se a porta ABRIU (para não encher de "FECHADA")
        if (data.status === 'ABERTA') {
            if (!roomLogs[data.room]) {
                roomLogs[data.room] = [];
            }

            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR');
            const logEntry = { time: timeString, msg: 'Porta Aberta' };

            // Adiciona no início da lista
            roomLogs[data.room].unshift(logEntry);

            // Mantém apenas os últimos 10 registros para economizar memória
            if (roomLogs[data.room].length > 10) {
                roomLogs[data.room].pop();
            }

            // Envia o log atualizado para a sala
            io.to(data.room).emit('history_update', logEntry);
        }

        // Envia o status em tempo real (Aberto/Fechado)
        socket.to(data.room).emit('update_monitor', data);
    });

    socket.on('disconnect', () => {
        // console.log('Saiu');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});