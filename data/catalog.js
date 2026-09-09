window.CATALOG={
  meta:{city:'成都市',englishSystems:['川教版·新路径英语（三年级起点）','人教版·PEP 小学英语（三年级起点）','外研版·新标准英语（三年级起点）','人教版·PEP 小学英语（一年级起点）','外研版·新标准英语（一年级起点）']},
 chinese:{name:'语文',icon:'文',versions:[{id:'unified',name:'统编版语文',note:'人民教育出版社·成都常用',grades:[{id:'g3',name:'三年级上册',units:[{id:'u1',name:'第一单元',items:[['大青树下的小学','dà qīng shù xià de xiǎo xué xiào'],['坪坝','píng bà'],['穿戴','chuān dài'],['鲜艳','xiān yàn'],['打扮','dǎ bàn'],['敬爱','jìng ài']]},{id:'u2',name:'第二单元',items:[['寒山','hán shān'],['石径','shí jìng'],['赠送','zèng sòng'],['橙色','chéng sè'],['挑促织','tiǎo cù zhī']]}]}]}]},
 english:{name:'英语',icon:'A',versions:[{id:'newpath',name:'川教版·新路径英语（三年级起点）',note:'四川教育出版社',grades:[{id:'g3',name:'三年级上册',units:[{id:'u1',name:'Unit 1 School',items:[['hello','你好'],['school','学校'],['teacher','老师'],['classmate','同学'],['book','书'],['pen','钢笔']]},{id:'u2',name:'Unit 2 Greetings',items:[['good morning','早上好'],['good afternoon','下午好'],['how are you','你好吗'],['fine','好的'],['thank you','谢谢你']]}]}]},{id:'pep',name:'人教版·PEP 小学英语（三年级起点）',note:'人民教育出版社',grades:[{id:'g3',name:'三年级上册',units:[{id:'u1',name:'Unit 1 Hello!',items:[['hello','你好'],['hi','嗨'],['name','名字'],['crayon','蜡笔'],['ruler','尺子'],['pencil','铅笔']]},{id:'u2',name:'Unit 2 Colours',items:[['red','红色'],['yellow','黄色'],['green','绿色'],['blue','蓝色'],['black','黑色']]}]}]},{id:'newstandard',name:'外研版·新标准英语（三年级起点）',note:'外语教学与研究出版社',grades:[{id:'g3',name:'三年级上册',units:[{id:'u1',name:'Module 1',items:[['I','我'],['am','是'],['a','一个'],['boy','男孩'],['girl','女孩']]},{id:'u2',name:'Module 2',items:[['what','什么'],['your','你的'],['name','名字'],['please','请'],['too','也']]}]}]}]}
};
// Starting-point variants remain separate so their unit data can be verified independently.
window.CATALOG.english.versions.push(
  {id:'pep-primary',name:'人教版·PEP 小学英语（一年级起点）',note:'人民教育出版社·一年级起点',grades:[]},
  {id:'newstandard-primary',name:'外研版·新标准英语（一年级起点）',note:'外语教学与研究出版社·一年级起点',grades:[]}
);
