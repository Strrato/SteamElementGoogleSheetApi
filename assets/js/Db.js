const Database = require('better-sqlite3');
const Utils = require('./Utils');
const db = new Database(__dirname + '/../db/diditwitchdb.db', { verbose: console.log });

const TABLE_NAME = "USER";
const FIELD_ID = "USER_ID";
const FIELD_ACCESS_TOKEN = "ACCESS_TOKEN";
const FIELD_REFRESH_TOKEN = "REFRESH_TOKEN";

function createIfNotExists()
{
    let def = `
        (
            ${FIELD_ID} TEXT,
            ${FIELD_ACCESS_TOKEN} TEXT,
            ${FIELD_REFRESH_TOKEN} TEXT,
            PRIMARY KEY (${FIELD_ID})
        )
    `;
    let sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} ${def};`;
    
    db.exec(sql);
}

let createTables = () => {
    createIfNotExists();
}

exports.userTemplate = {
    user : "",
    refresh_token : "",
    access_token : "",
};


function rowToUser(row) 
{
    let user = Object.assign({}, exports.userTemplate);
    if (row){
        user.user = row[FIELD_ID];
        user.refresh_token = row[FIELD_REFRESH_TOKEN];
        user.access_token = row[FIELD_ACCESS_TOKEN];
    }
    return user;
}

exports.getUser = (userId) => {
    createTables();

    userId = Utils.satanize(userId);

    let sql = `SELECT * FROM ${TABLE_NAME} WHERE ${FIELD_ID} = ?`;
    let stmt = db.prepare(sql);
    let row = stmt.get(userId);
    return rowToUser(row);
};

exports.setUser = (userId, refresh_token, access_token) => {
    createTables();

    userId = Utils.satanize(userId);

    let sql = `INSERT OR REPLACE INTO ${TABLE_NAME} (${FIELD_ID}, ${FIELD_REFRESH_TOKEN}, ${FIELD_ACCESS_TOKEN}) VALUES(?,?,?);`
    let stmt = db.prepare(sql);
    let res = stmt.run(userId, refresh_token, access_token);
    return "Utilisateur ajouté avec succès";
}

exports.updateAccessToken = (userId, access_token) => {
    createTables();
    userId = Utils.satanize(userId);

    let sql = `UPDATE ${TABLE_NAME} SET ${FIELD_ACCESS_TOKEN} = ? WHERE ${FIELD_ID} = ?`;
    let stmt = db.prepare(sql);
    let res = stmt.run(access_token, userId);
    return "Access token updated";
};

exports.removeUser = userId => {
    createTables();

    userId = Utils.satanize(userId);
    let sql = `DELETE FROM ${TABLE_NAME} WHERE ${FIELD_ID} = ?`;
    let stmt = db.prepare(sql);
    let res = stmt.run(userId);
    return "Utilisateur supprimé";
}