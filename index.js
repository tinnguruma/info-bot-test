//ここ参考にしました！ -> https://qiita.com/akikaki_san/items/d110ababd9687b7be6e7
const http = require("http");
const querystring = require("querystring");
const discord = require("discord.js");
const { createCanvas, loadImage } = require('canvas');
const { MessageEmbed } = require('discord.js');
const { WebSocket } = require('ws')
const fetch = require('node-fetch');
const fs = require('fs');
const client = new discord.Client();
const prefix = process.env.prefix;
const ch_id = '1134420587847110666'
let cache;

try {
    http.createServer(function (req, res) {
        res.write("OKOKOKOKOK!!!!!");
        res.end();
    }).listen(8080);
    client.on("ready", message => {
        console.log("準備完了");
        client.user.setActivity(process.env.activity, { type: process.env.acttype });
    });




    const ws = new WebSocket('wss://api.p2pquake.net/v2/ws')
    const ChangeToView = require('./lib.js')
    const c = new ChangeToView()

    // Websocket
    ws.onmessage = async (data) => {

        const o = JSON.parse(data.data)
        console.log("Response P2P WebSocketServer. Code :" + o.code)


        // 緊急地震速報発表検出        #RED
        if (o.code === 554) {
            var embed = new MessageEmbed().setTitle('緊急地震速報').setDescription(`緊急地震速報です。強い揺れに警戒して下さい。\n緊急地震速報が発令された地域では、震度5弱以上の揺れが来るかもしれません。\n落ち着いて、身の安全を図ってください。`).setColor('RED')
            client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
        }


        // 緊急地震速報(警報) ※非推奨  #992D22(濃い赤)
        if (o.code === 556) {
            let Istest = o.test ?? false
            let k_time = o.earthquake.originTime   // 発生時刻
            let k_atime = o.earthquake.arrivalTime // 発現時刻
            let k_description = o.eathquake.hypocenter.description
            let k_name = o.eathquake.hypocenter.name ?? "[不明]"
            let k_depth = o.eathquake.hypocenter.depth
            let k_mag = o.eathquake.hypocenter.magnitude
            let k_Htime = o.issue.time
            let k_cancelled = o.cancelled

            if (k_depth === -1) return k_depth = "[不明]"
            if (k_mag === -1) return mk_ag = "[不明]"

            if (Istest === true) return;


            var embed = new MessageEmbed().setTitle('緊急地震速報(警報)').setDescription(`〈情報〉\n${k_name} M${k_mag} \n・震源の深さ : ${k_depth}km\n・発生時刻 : ${k_time}\n・発現時刻 : ${k_atime}\n\n${k_description}\n`).setColor('#992D22')
            client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
        }


        // 地震感知                   #黒
        if (o.code === 561) {
            //client.channels.cache.get(ch_id).send("地震検知").catch(e => { })
            let p_time = o.time
            let p_area = o.area

            let p_place = findValueFromCSV(p_area)

            if (p_place == "地域未設定") return;

            //var embed = new MessageEmbed().setTitle(`地震感知 [${p_place}]`).setColor('BLACK')
            //client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
        }


        // ノーマル地震情報             #黄色
        if (o.code === 551) {
            let msindo = c.shindo(o.earthquake.maxScale)
            let atime = o.earthquake.time
            let domesticTsunami = o.earthquake.domesticTsunami
            let depth = o.earthquake.hypocenter.depth
            let magunitude = o.earthquake.hypocenter.magnitude
            let hyposentername = o.earthquake.hypocenter.name
            let m_lat = o.earthquake.hypocenter.latitude
            let m_lon = o.earthquake.hypocenter.longitude
            let pointskazu = o.points.length
            let eq = ""
            let info = ""
            let tsunamiwarning = ""

            if (depth === -1) return depth = "[不明]"
            if (magunitude === -1) return magunitude = "[不明]"
            if (hyposentername === undefined) return hyposentername = "[不明]"

            if (domesticTsunami === "Warning") tsunamiwarning = "現在、津波警報が発表されています。"
            else tsunamiwarning = "津波の心配:なし"


            // let maxscaleplace = ""
            // for (i of o.points) {
            //     if (i.scale === o.earthquake.maxScale) {
            //         maxscaleplace += "**" + i.addr + "**\n"
            //     }
            // }

            let title = `地震情報 - [最大震度${msindo}]`

            // if (msindo > 2) {
            //     var placedescription = `最大震度${msindo}を\n${maxscaleplace}で観測しています。`
            // } else {
            //     let placedescription_temp = o.points.addr[0]
            //     var placedescription = `最大震度${msindo}を\n${placedescription_temp}等で観測しています。`
            // }

            if (o.earthquake.maxScale === -1 && maxscaleplace === "") {
                title = `地震情報 - 震源情報`
                placedescription = ""
            }

            //console.log(pointskazu)
            var embed = new MessageEmbed().setTitle(title).setDescription(`**${hyposentername}**\n・深さ${depth}km / M${magunitude}\n・発生時刻 : ${atime}\n**${tsunamiwarning}**`).setColor('YELLOW')
            client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })

            //画像生成
            addCrossMarkToImage('./map.png', m_lat, m_lon, 'gen_ed.png');

            //画像送信
            client.channels.cache.get(ch_id).send({ files: ['./gen_ed.png'] })

        }




        // 津波予報          #赤
        if (o.code === 552) {
            let t_cancelled = o.cancelled
            let t_grade = c.tsunami_y(o.areas.grade) ?? 0
            let t_immediate = o.areas.immediate ?? 0
            let t_name = o.areas.name ?? 0
            let t_time = o.issue.time ?? 0
            let t_source = o.issue.source ?? 0

            if (t_cancelled) return;

            if (t_immediate) {
                t_immediate = '直ちに到達/到達済み'
            } else {
                t_immediate = '「直ちに津波が来襲すると予想されている」ではない'
            }

            var embed = new MessageEmbed().setTitle('津波情報').setDescription(`[${t_grade}]\z${t_name}\n・発表時刻 : ${t_time}\n・情報元 : ${t_source}\n\n${t_immediate}`).setColor('RED')
            client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
        }


        // 地震感知情報評価結果         #黒
        if (o.code === 9611) {
            let ev_count = o.count
            let ev_confidence = o.confidence//P2P地震情報 Beta3 における信頼度（0～1）

            if (ev_confidence == 0) {
                var ev_ev = '非表示'
            } else if (ev_confidence > 0.97015) {
                var ev_ev = 'レベル1'
            } else if (ev_confidence > 0.96774) {
                var ev_ev = 'レベル2'
            } else if (ev_confidence > 0.97024) {
                var ev_ev = 'レベル3'
            } else if (ev_confidence > 0.98052) {
                var ev_ev = 'レベル4'
            } else {
                var ev_ev = '評価範囲外'
            }

            if (ev_confidence == 0) return;
            if (ev_ev == '非表示') return;

            let ev_stime = o.started_at ?? '[不明]'
            let ev_utime = o.updated_at ?? '[不明]'

            ev_confidence = ev_confidence * 100

            //各地の情報はいいかな...()

            if (ev_count > 4) {
                if (ev_count % 10 == 0 || ev_count == 5) {
                    var embed = new MessageEmbed().setTitle('地震感知情報評価結果').setDescription(`・件数/レベル : ${ev_count}件/[${ev_ev}]\n・信頼度 : ${ev_confidence}%\n・開始日時 : ${ev_stime}\n・更新日時 : ${ev_utime}`).setColor('BLACK')
                    client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
                }
            }
        }

    }
    //ここまでうぇぶそけっと







    // 時間フォーマット
    function getCurrentDateTime() {
        const now = new Date();
        const later = new Date(now.getTime() + (9 * 60 * 60 * 1000) + 1000);
        const year = later.getFullYear();
        const month = String(later.getMonth() + 1).padStart(2, '0');
        const day = String(later.getDate()).padStart(2, '0');
        const hours = String(later.getHours()).padStart(2, '0');
        const minutes = String(later.getMinutes()).padStart(2, '0');
        const seconds = String(later.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }


    setInterval(function () {
        var formattedDateTime = getCurrentDateTime();
        var eew_url = `http://www.kmoni.bosai.go.jp/webservice/hypo/eew/${formattedDateTime}.json`

        fetch(eew_url)
            .then(response => response.json())
            .then(data => {
                //console.log(data);
                if (data.result.message == "データがありません") return;

                // 地震発生
                var eew_time = data.origin_time
                var eew_num = data.report_num
                var eew_name = data.region_name
                var eew_lat = data.latitude
                var eew_lon = data.longitude
                var eew_depth = data.depth
                var eew_max = data.calcintensity
                var eew_mag = data.magunitude

                var eew_final = data.is_final
                var eew_cansel = data.is_cancel
                var eew_test = data.is_training
                var eew_warn = data.alertflg ?? "" //予報/警報

                if (eew_final) {
                    var eew_hou = "最終報"
                } else {
                    var eew_hou = `第${eew_num}報`
                }


                if (eew_num > cache) {
                    //cancel報
                    if (eew_cansel) {
                        var embed = new MessageEmbed().setTitle('[キャンセル報]').setDescription(`緊急地震速報はキャンセルされました\n・${eew_hou}`).setColor('GREEN')
                        client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
                        return
                    }

                    //test報
                    if (eew_test) {
                        var embed = new MessageEmbed().setTitle('[テスト報]').setDescription(`この速報はテストです(俺は知らん)`).setColor('GREEN')
                        client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
                        return
                    }

                    //nomal報
                    var embed = new MessageEmbed().setTitle(`[高度]EEW -${eew_hou}- [${eew_warn}] - 最大震度${eew_max}`).setDescription(`・震源 : ${eew_name}\n・深さ : ${eew_depth} / M${eew_mag}\n・N${eew_lat} E${eew_lon}`).setColor('YELLOW')
                    client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })

                }

                cache = eew_num;


            })
            .catch(error => {
                console.error(error);
            });
    }, 1000);





    client.on("message", async message => {
        if (message.author.id == client.user.id || message.author.bot) return;




        // if (message.mentions.has(client.user)) {
        //     message.reply("呼びましたか?");
        // }
        //if (!message.content.startsWith(prefix)) return;
        //const args = message.content.slice(prefix.length).trim().split(/ +/g);
        //const command = args.shift().toLowerCase();
        if (message.content === "test") {
            if (message.author.id == "893394948555149332") {
                var embed = new MessageEmbed().setTitle('送信テスト').setDescription(`これは送信テストです\n念のため備えましょう。\n発生時刻 : now`).setFooter(`id : none`).setColor('#992D22')
                client.channels.cache.get(ch_id).send(embed).catch(e => { console.log(e) })
            }
            // message.channel.send({
            //     embed: {
            //         title: "ヘルプ",
            //         description: "全てのコマンドの初めに`" + prefix + "`をつける必要があります。",
            //         fields: [
            //             {
            //                 name: "ヘルプ",
            //                 value: "`help`"
            //             }
            //         ]
            //     }
            // });
        }






    });
    if (process.env.DISCORD_BOT_TOKEN == undefined) {
        console.log("DISCORD_BOT_TOKENが設定されていません。");
        process.exit(0);
    }
    client.login(process.env.DISCORD_BOT_TOKEN);
} catch (e) {
    console.log(e);
    logError(e);
}



//<<<<<関数ゾーン>>>>>



// 地域コードから場所
function findValueFromCSV(number) {
    const fileContents = fs.readFileSync('epsp-area.csv', 'utf8')
    const rows = fileContents.split('\n')

    for (let i = 0; i < rows.length; i++) {
        const values = rows[i].split(',')
        if (values[1] === number.toString()) {
            return values[4]
        }
    }
    return null
}

//以下画像生成系

// 緯度経度を画像上の座標に変換
function latLngToPixel(lat, lng, imageWidth, imageHeight) {
    const latMin = 30;
    const latMax = 46;
    const lngMin = 128;
    const lngMax = 149;
    const x = (lng - lngMin) * (imageWidth / (lngMax - lngMin));
    const y = (latMax - lat) * (imageHeight / (latMax - latMin));
    return [x, y];
}

// 画像にばつ印
async function addCrossMarkToImage(imagePath, lat, lng, savePath) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // 緯度経度を画像上の座標に変換
    const [x, y] = latLngToPixel(lat, lng, image.width, image.height);

    // 描画
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.moveTo(x - 20, y - 20);
    ctx.lineTo(x + 20, y + 20);
    ctx.moveTo(x + 20, y - 20);
    ctx.lineTo(x - 20, y + 20);
    ctx.stroke();

    addConcentricCirclesToImage(ctx, x, y, 50, 3, 'red');

    // 変更した画像を保存
    const out = fs.createWriteStream(savePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
}

// 同心円描画
function addConcentricCirclesToImage(ctx, centerX, centerY, radius, numCircles, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    for (let i = 1; i <= numCircles; i++) {
        ctx.arc(centerX, centerY, radius * i, 0, 2 * Math.PI);
    }
    ctx.stroke();
}







// 以下log関連

function logError(error) {
    let i = 0;
    while (fs.existsSync(`error${i}.log`)) {
        i++;
    }
    fs.writeFileSync(`error${i}.log`, error);
}