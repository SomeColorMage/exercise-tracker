const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

// these are for ID generation
const Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const IDLength = 24;

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI);

const ExerciseTrackSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, required: true },
  _id: { type: String, required: true },
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const ExerciseTrackUser = mongoose.model("Exercise", ExerciseTrackSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  let username = req.body.username;

  // generate an id
  let id = '';
  for(let i = 0; i < IDLength; i++) {
    id += Characters.charAt(Math.random() * Characters.length);
  }

  let newUser = new ExerciseTrackUser({
    username: username,
    count: 0,
    _id: id
  });

  await newUser.save();
  res.json({
    username: newUser.username,
    _id: newUser._id
  })
});

app.get('/api/users', async (req, res) => {
  let allUsers = await ExerciseTrackUser.find();
  let allUsersTrimmed = [];

  // remove the count/log, if present
  allUsers.forEach(entry => {
    allUsersTrimmed.push({
      username: entry.username,
      _id: entry._id
    });
  });

  res.send(allUsersTrimmed);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  let user = await ExerciseTrackUser.findOne({ _id: req.params._id });

  if(user) {
    let newLog = {
      date: req.body.date ? (new Date(req.body.date)).toDateString() : (new Date()).toDateString(),
      duration: parseInt(req.body.duration),
      description: req.body.description
    };
    user.log.push(newLog);
    user.count++;
    await user.save();
    res.json({
      username: user.username,
      description: newLog.description,
      duration: newLog.duration,
      date: newLog.date,
      _id: user._id
    });
  } else {
    res.json({ error: "No user with that ID" });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let user = await ExerciseTrackUser.findOne({ _id: req.params._id });

  if(!user) {
    res.json({ error: "No user with that ID" });
    return;
  }

  let logs = [];
  user.log.forEach(entry => {
    logs.push({
      description: entry.description,
      duration: entry.duration,
      date: entry.date
    });
  });

  let from = req.query.from;
  let to = req.query.to;

  if(from && to) {
    let fromDate = processAsDate(from);
    let toDate = processAsDate(to);

    logs = logs.filter(entry => {
      let date = new Date(entry.date);
      return fromDate <= date <= toDate;
    });
  }

  let limit = req.query.limit;

  if(limit)
    logs = logs.slice(0, limit);

  logs.forEach(entry => entry.date = entry.date.toDateString());

  res.json({
    username: user.username,
    count: user.count,
    _id: user._id,
    log: logs
  });
});

// not part of the solution, just a quick way to clear the DB between runs to avoid issues from old or malformed data
app.get('/api/reset', async (req, res) => {
  await ExerciseTrackUser.deleteMany({});
  res.redirect("/");
});

function processAsDate(dateString) {
  let split = dateString.split('-');
  let date = new Date(split[0], parseInt(split[1]) - 1, split[2]);
  return date;
}

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
