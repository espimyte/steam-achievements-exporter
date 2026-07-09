/* 
 * Author: espimyte (espy.world) 
 */

import fs from 'fs';
import http from 'http';
import stream from 'node:stream';

/**
 * Retrieves JSON file
 * @param file filename to read
 * @returns JSON parsed data
 */
export function fetchJSON(file) {
    try {
        const raw = fs.readFileSync(file);
        const data = JSON.parse(raw);
        return data;
    } catch (e) {
        if (e.code !== 'ENOENT') console.log(`\x1b[31m${e.name}\x1b[0m : ${e.message}`);
    }
}

/**
 * Writes to JSON file with data
 * @param file filename to write to
 * @param data data to write to file 
 */
export function writeJSON(file, data, sync = false) {
    try {
        const json = JSON.stringify(data);
        if (sync) {
            fs.writeFileSync(file, json, 'utf8');
            console.log(`\x1b[34mWrote to \x1b[33m${file}\x1b[0m`);
        } else {
            fs.writeFile(file, json, 'utf8', () => {
                console.log(`\x1b[34mWrote to \x1b[33m${file}\x1b[0m`);
            });
        }
    } catch (e) {
        console.log(`\x1b[31m${e.name}\x1b[0m : ${e.message}`);
    }
}

/**
 * Fetches an image from a url and saves it
 * @param file filename to write to
 * @param url url to fetch data from 
 * @returns image promise
 */
export function saveImageFromURL(file, url) {     
    const promise = new Promise((resolve, reject) => {
        try {
            http.request(url, function(response) {                                        
                var data = new stream.Transform();                                                    

                response.on('data', function(chunk) {                                       
                    data.push(chunk);                                                         
                });                                                                         

                response.on('end', function() {                                             
                    fs.writeFileSync(file, data.read());        
                    // console.log(`\x1b[34mWrote \x1b[35m${url} \x1b[34mto \x1b[33m${file}\x1b[0m`)
                    resolve(true)                   
                });                                                            
            }).end();
        } catch (e) {
            console.log(`\x1b[31m${e.name}\x1b[0m : ${e.message}`);
            resolve(false);
        }    
    }) 
    return promise;     
}

/**
 * Fetches JSON data from a url
 * @param url url to fetch data from 
 * @returns the json from data from the url
 */
export async function fetchJSONfromURL(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (e) {
        console.log(`\x1b[31m${e.name}\x1b[0m : ${e.message}`);
    }
}