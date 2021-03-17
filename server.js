// including - importing libraries
const express = require('express');
const superAgent = require('superagent');
const pg = require('pg');
const cors = require('cors');
const methodOverride = require('method-override');

// setup and configuration
require('dotenv').config();
const app = express();
app.use(cors());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PORT = process.env.PORT;

// End Points

app.get('/', handeHome);
app.post('/getCountryResult', searchHandler);
app.get('/allcountries', allCountries);
app.post('/myRecords', myRecords);
app.get('/myRecords/:id', showRecords);
app.delete('/myRecords/:id', deleteRecords);
app.get('/recordDetails/:id', recordDetails);
app.get('*', hendleError);



//  call handles

function hendleError(req, res) {
    res.status(404).send('this page does not exists');
}


function handeHome(req, res) {
    let url = 'https://api.covid19api.com/world/total'
    superAgent.get(url).then(data => {
        res.render('index', { data: data.body })
    }).catch(error => {

        console.log('issue get data from API ', error);
    });
}

function searchHandler(req, res) {
    let city = req.body.city;

    let from = req.body.from;
    let to = req.body.to;
    let url = `https://api.covid19api.com/country/${city}/status/confirmed`
    let query = {
        from: from,
        to: to
    }
    superAgent.get(url).query(query).then(data => {
        let newArr = [];

        // res.send(data.body.Country)
        data.body.map(value => {
            let date = value.Date;

            let cases = value.Cases;
            let covied = new Search(date, cases);
            newArr.push(covied);
        })

        res.render('getCountryResult', { dataArr: newArr });

    }).catch(error => {

        console.log('issue get search data from API ', error);
    });
}


function allCountries(req, res) {
    let url = 'https://api.covid19api.com/summary';
    superAgent.get(url).then(data => {
        let newArr = [];
        data.body.Countries.map(value => {
            let country = value.Country;
            let totalConfirmed = value.TotalConfirmed;
            let totalDeaths = value.TotalDeaths;
            let totalRecovered = value.TotalRecovered;
            let date = value.Date;
            let covied = new AllCountries(country, totalConfirmed, totalDeaths, totalRecovered, date);
            newArr.push(covied);

        })

        res.render('AllCountries', { dataArr: newArr })
    }).catch(error => {
        console.log('issue get data for all county from API ', error);
    });
}

function myRecords(req, res) {

    let insertDb = 'INSERT INTO examtable  (country, totalConfirmed, totalDeaths, totalRecovered, date) VALUES ($1,$2,$3,$4,$5) RETURNING *;';
    let safeValues = [req.body.country, req.body.totalConfirmed, req.body.totalDeaths, req.body.totalRecovered, req.body.date]
    client.query(insertDb, safeValues).then((data) => {
        let id = data.rows[0].id;
        res.redirect('/myRecords/' + id);
    }).catch(error => {
        console.log('issue insert data in database ', error);
    });
}

function showRecords(req, res) {
    let id = req.params.id;
    let selectDb = 'SELECT * FROM examtable WHERE id=$1;';
    client.query(selectDb, [id]).then(data => {
        res.render('myRecords', { data: data.rows[0] })
    }).catch(error => {
        console.log('issue select data from database ', error);
    });
}


function recordDetails(req, res) {

    let id = req.params.id;
    let selectDb = 'SELECT * FROM examtable WHERE id=$1;';
    client.query(selectDb, [id]).then(data => {
        res.render('recordDetails', { data: data.rows[0] })
    }).catch(error => {
        console.log('issue select data from database ', error);
    });

}


function deleteRecords(req, res) {
    let id = req.params.id;
    let deleteDB = 'DELETE FROM examtable WHERE id =$1;';
    client.query(deleteDB, [id]).then(() => {
        res.redirect('/myRecords')
    }).catch(error => {
        console.log('issue wuth delateing data ffrom database ', error);
    });
}
function Search(date, cases) {
    this.date = date;

    this.cases = cases;
}





function AllCountries(country, totalConfirmed, totalDeaths, totalRecovered, date) {

    this.country = country;
    this.totalConfirmed = totalConfirmed;
    this.totalDeaths = totalDeaths;
    this.totalRecovered = totalRecovered;
    this.date = date;
}





client.connect().then(() => {
    app.listen(PORT, () => {
        console.log(' app is listen on PORT ', PORT);
    })
}).catch(error => {
    console.log('issue with coniecting in database ', error);
});