export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    service:'ETHAN AI Search',
    searchMode:'hybrid',
    freeSearch:true,
    premiumSearch:true,
    time:new Date().toISOString()
  });
}
