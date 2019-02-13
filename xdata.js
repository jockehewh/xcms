/* 
*
*xdata
*
* 
*/

var fs = require('fs')

module.exports = {
    get: ()=>{
        return fs.createReadStream('./xcmsDB/Xdata.db', {autoclose: true, encoding:'utf8'})
    },
    set: (xdata)=>{
        var item= ''
        var test = fs.createReadStream('./xcmsDB/Xdata.db', {autoclose: true, encoding:'utf8'});
        test.on('data', (data)=>{
            item+= data
        })
        test.on('end', ()=>{
            var temp = JSON.parse(item)
            temp.push(xdata)
            var reecrit = fs.createWriteStream('./xcmsDB/Xdata.db',{encoding:'utf8'})
            reecrit.write(JSON.stringify(temp))
            reecrit.end()
        })
    },
    update: (xdata)=>{
        let stream = fs.createWriteStream('./xcmsDB/Xdata.db',{encoding:'utf8'})
        stream.write(JSON.stringify(xdata))
        stream.end()
    }
}