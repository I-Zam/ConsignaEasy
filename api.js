
async function api(action,data={}){

try{

const res = await fetch(API_URL,{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({action,...data})
});

const json = await res.json();

if(!json.success){
console.error(json.error);
alert("API error: "+json.error);
return null;
}

return json.data;

}catch(e){

console.error(e);
alert("Connection error");
return null;

}
}
