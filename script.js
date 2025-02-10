
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const message = button.closest('.message');
            const codeBlock = message.querySelector('pre');
            if (codeBlock) {
                const text = codeBlock.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    alert('Copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
    });
});