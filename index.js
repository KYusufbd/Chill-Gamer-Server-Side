const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`Chill Gamer server is running!! on port: ${port}`);
})

app.listen(port);