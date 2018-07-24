/* 
*
*xdata
*
* 
*/

var fs = require('fs')

module.exports = {
    get: ()=>{
        return fs.createReadStream('./xcmsDB/XData.db', {autoclose: true, encoding:'utf8'})
    },
    set: (xdata)=>{
        var item= ''
        var test = fs.createReadStream('./xcmsDB/XData.db', {autoclose: true, encoding:'utf8'});
        test.on('data', (data)=>{
            item+= data
        })
        test.on('end', ()=>{
            //.log(JSON.parse(item))
            var temp = JSON.parse(item)
            console.log(xdata)
            temp.push(xdata)
            var reecrit = fs.createWriteStream('./xcmsDB/XData.db',{encoding:'utf8'})
            reecrit.write(JSON.stringify(temp))
            reecrit.end()
        })
    }
}