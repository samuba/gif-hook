let express = require('express')
let bodyParser = require('body-parser')
let request = require('request-promise')

let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

const notFoundMsg = "...sorry. I couldn't find a GIF for that :-("

app.get("/", (request, response) => {
  response.sendFile(__dirname + '/views/index.html')
})

app.post("/mattermost/webhook", (req, res) => {
  // TODO: check if token is: process.env.MATTERMOST_TOKEN
  console.log("req", req.body)
  let phrase = req.body.text.replace(req.body.trigger_word, '')
  
  handleRequest(phrase, 
    gifUrl => res.send({ text: gifUrl }),
    () => res.send({ text: notFoundMsg }),
    error => res.send(500)
  )
})

app.post("/mattermost/slashcommand", (req, res) => {
  // TODO: check if token is: process.env.MATTERMOST_TOKEN
  console.log("req", req.body)
  let phrase = req.body.text
  
  handleRequest(phrase, 
    gifUrl => res.send({
      response_type: "in_channel",
      text: `${req.body.user_name}: /gif ${req.body.text} \n ${gifUrl}`,
      // the following params are disabled by admins right now 
      username: req.body.user_name,
      icon_url: `https://matter.mercedes-benz.com/api/v3/users/{req.body.user_id}/image`
    }),
    () => res.send({ text: notFoundMsg, response_type: "ephemeral"  }),
    error => res.send(500)
  )
})

function handleRequest(phrase, successFunc, notFoundFunc, errorFunc) {
  phrase = phrase.trim()
  console.log("phrase:", phrase)
  
  fetchGifsFromGiphy(phrase, errorFunc, gifs => {
    if (gifs.length <= 0) {
      notFoundFunc()
      return
    }

    const goodGifs = gifsThatWereTrending(gifs)
    const gif = goodGifs.length > 0 ? pickRandom(goodGifs) : pickRandom(gifs)
    successFunc(gif.images.original.url.replace("http://", "https://"))
  })  
}

function fetchGifsFromGiphy(phrase, errorFunc, func) {
  phrase = phrase.replace(/ /g, '+')
  request({ 
    uri: `http://api.giphy.com/v1/gifs/search?q=${phrase}&api_key=dc6zaTOxFJmzC`, 
  }).then(x => {
    let gifs = JSON.parse(x).data
    console.log("gifs:", gifs.length)
    func(gifs)
  }).catch(err => {
    console.error("Error while querying giphy", err)
    errorFunc(err)
  })
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function gifsThatWereTrending(gifs){
  let result = gifs.filter(x => x.trending_datetime != "0000-00-00 00:00:00" && 
                                x.trending_datetime != "1970-01-01 00:00:00")
  console.log("trending gifs:", result.length)
  return result
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})
