let loading;
export function loadRazorpay() {
  if(window.Razorpay)return Promise.resolve(window.Razorpay);
  if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=()=>window.Razorpay?resolve(window.Razorpay):reject(Error('Payment checkout did not load.'));script.onerror=()=>reject(Error('Could not load Razorpay. Please retry.'));document.head.append(script);}).catch(e=>{loading=null;throw e;});
  return loading;
}
export async function openCheckout(order,{request,email,onVerified}) {
  const Razorpay=await loadRazorpay();
  return new Promise((resolve,reject)=>{
    const checkout=new Razorpay({key:order.keyId,order_id:order.orderId,amount:order.amount,currency:order.currency,name:'ConvertShorts',description:order.description,prefill:{email:email||''},theme:{color:'#8893ff'},handler:async result=>{try{const d=await request('/functions/v1/convertshorts-billing',{method:'POST',body:{action:'verify',orderId:order.orderId,paymentId:result.razorpay_payment_id,signature:result.razorpay_signature}});await onVerified(d);resolve(d);}catch(e){e.paymentVerificationPending=true;reject(e);}},modal:{ondismiss:()=>resolve(null)}});
    checkout.on('payment.failed',()=>reject(Error('Payment was not completed. Your balance has not been changed.')));
    checkout.open();
  });
}
