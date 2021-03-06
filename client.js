//Config
const config = require('./config.json');

//Socket
const io = require('socket.io-client');
const socket = io('https://crnotify.cf')
// const socket = io('http://localhost:8080/')

//Requires
const random_useragent = require('random-useragent');
const chalk = require('chalk');

//On connection
socket.on('connect', function(){
  console.log(chalk.green('Successfully connected!'))
})

socket.on('disconnect', function(){
    console.log(chalk.yellow('Disconnected from socket!'))
});

//Functions
function checkCRN(termID, crn, cb) {

  const Horseman = require('node-horseman');

  const horseman = new Horseman({
    // cookiesFile: './cookies.txt',
    diskCache: true,
    diskCachePath: './browsercache',
    timeout: 15000,
    loadImages: false,
    // proxyType: 'socks5',
    // proxy: '127.0.0.1:9050',
    ignoreSSLErrors: true
  });

  horseman
    .userAgent(random_useragent.getRandom())
    .on('error', function(msg){
      console.log(chalk.red(`Error crawling CRN!`))
      cb(true, null)
    })
    .on('timeout', function(){
      console.log(chalk.red(`Timeout crawling CRN!`))
      cb(true, null)
    })
    .cookies([])
    .open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${crn}`)
    .catch(function(e){
      console.log(chalk.red(`Error crawling CRN!`))
      cb(true, null)
    })
    .html()
    .then(function(body) {
      cb(false, body)
      return horseman.close()
  })
}

function fetchStatus(termID, subject, crns) {

  return new Promise(function(resolve, reject) {

    const Horseman = require('node-horseman');

    const postData = `term_in=${termID}&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sel_subj=${subject}&sel_crse=&sel_title=&sel_from_cred=&sel_to_cred=&sel_levl=%25&sel_instr=%25&sel_attr=%25&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a`

    const horseman = new Horseman({
      // cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache',
      timeout: 15000,
      loadImages: false,
      // proxyType: 'socks5',
      // proxy: '127.0.0.1:9050',
      ignoreSSLErrors: true
    });

    horseman
      .userAgent(random_useragent.getRandom())
      .on('error', function(msg){
        reject()
      }, reject)
      .on('timeout', function(){
        console.log(chalk.red(`Timeout for ${subject}!`))
        reject()
      }, reject)
      .post('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_get_crse_unsec', postData)
      .wait(5000)
      .catch(function(e) {
        reject()
      }, reject)
      .evaluate(function(data){

        var array = []

        data.crns.forEach(function(item, i){
          var a = $('a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in='+data.termID+'&crn_in='+item.crn+'"]').closest('tr').next().find('td[colspan="1"]').text()
          array.push({crn: item, status: a})
        })

        return array;
      }, {termID, subject, crns})
      .then(function(data){
        resolve(data)
        return horseman.close();
      })
  })
}

//Socket handlers
socket.on(`checkCRN_${config.misc.secret}`, function(termID, crn, cb) {
  console.log(chalk.blue(`Checking CRN ${crn}...`))
  checkCRN(termID, crn, cb)
  console.log(chalk.blue(`Done checking ${crn}.`))
})

socket.on(`crawlCRN_${config.misc.secret}`, function(termID, subject, crns, cb){

  console.log(chalk.blue(`Crawling subject ${subject}...`))

  fetchStatus(termID, subject, crns).then(function(body){
    cb(false, body)
    console.log(chalk.blue(`Done crawling ${subject}.`))
  }).catch(function(){
    cb(true, null)
    console.log(chalk.blue(`Done crawling ${subject}.`))
  })

})

socket.on('auth', function(){
  socket.emit(`${config.misc.secret}`)
})
