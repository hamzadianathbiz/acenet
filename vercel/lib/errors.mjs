export function publicError(error){
 if(error?.message?.startsWith('Vercel Blob:')||error?.message==='Private storage is not connected.')return {message:'Private workspace storage is temporarily unavailable. The app owner needs to restore hosting storage before accounts and tasks can be used.',status:503,retryAfter:900};
 return {message:error?.message||'Request failed.',status:400};
}
