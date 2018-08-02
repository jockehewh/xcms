console.log('designer.js...')

window.onload = ()=>{
    var hcount = 1
    while(hcount <= 6){
        document.querySelectorAll('h'+hcount).forEach(titre =>{
            if(titre.getAttribute('lien') === 'true'){
                document.querySelectorAll('.genesis-menu li a').forEach(lien=>{
                    console.log(lien.innerText.toLowerCase(), titre.innerText.toLowerCase())
                    if(lien.innerText.toLowerCase() === titre.innerText.toLowerCase()){
                        console.log(lien.href.toLowerCase(), titre.innerText.toLowerCase())
                        titre.id = titre.innerText
                    }
                })
            }
        })
        hcount++
    }
}