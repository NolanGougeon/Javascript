import * as fs from 'fs';
import path from 'path';

fs.readdir('./public/assets/img/',function(err,files){
    if (err) {
        throw err;
    }
    files.forEach( function(file){
        const stat = fs.statSync('./public/assets/img/' + file);
        if (stat.isDirectory() === true) {
            fs.readdir('./public/assets/img/' + file ,function(err,underFiles){
                if (err) {
                    throw err;
                }
                const underPath = './public/assets/img/' + file + '/';
                underFiles.forEach( function(underFile){
                    const statUnderFile = fs.statSync(underPath + '/' + underFile);
                    if (path.extname(underPath + underFile) === '.png' || path.extname(underPath + underFile) === '.ico' || path.extname(underPath + underFile) === '.jpg' || path.extname(underPath + underFile) === '.gif') {
                        const valeur = underPath + underFile;
                        const sizeUnderFile = statUnderFile.size;
                        const sizeUnderFileKo = sizeUnderFile/1000;
                        if(sizeUnderFileKo > 200){
                            console.log(underFile + ': ' + sizeUnderFileKo + ' ko');
                        }
                    }
                })
            })
        }
        else {
            const pathDir = './public/assets/img/';
            if (path.extname(pathDir + file) === '.png' || path.extname(pathDir + file) === '.ico' || path.extname(pathDir + file) === '.jpg' || path.extname(pathDir + file) === '.gif') {
                const valeur = pathDir + file;
                const taillebytes = stat.size;
                const tailleKo = taillebytes/1000;
                if(tailleKo > 200){
                    console.log(file);
                    console.log(tailleKo);
                }
            }
        }
    });
});
;
