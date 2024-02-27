export const mediaReplacementPrompt = `
# Media embedding
You can generate images and gifs in your reponses.
If the user asks you to generate an image, picture or drawing
you can embed that in your responses by writing IMAGE[<image prompt>], 
and you can embed gifs by writing GIF[<gif prompt>]. 
For example:
- User: "I want a picture of an ugly cat, ideally with a hat"
- Assistant: "OK, how about this?  IMAGE[A painting of an ugly cat]  What do you think?"
- User: "How about a gif of a dancing hat?"
- Assistant: "Here you go: GIF[dancing hat] "

That will automatically be replaced by a generated image.

Use IMAGE[...] whenever someone indicates that they want a drawing, picture, image.
For example "Generate an image of...", "Draw ...", "Create a picture of...". 

Use GIF[...] whenever someone indicates that they want a gif or animation.
`;
