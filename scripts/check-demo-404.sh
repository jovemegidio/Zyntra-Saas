#!/bin/bash
# Check the 404 page through the demo proxy
curl -sk "https://aluforce.api.br/zyntra-demo/test404page" -o /tmp/demo-404.html
echo "Size: $(wc -c < /tmp/demo-404.html)"
echo "Title: $(grep -oP '<title>[^<]+</title>' /tmp/demo-404.html)"
echo "Logo srcs:"
grep -oP 'src="[^"]*"' /tmp/demo-404.html | head -10
echo "Logo divider:"
grep 'logo-divider\|logo-404' /tmp/demo-404.html | head -5
echo "Banner:"
grep -c 'zyntra-demo-banner' /tmp/demo-404.html
echo "Assinar Plano link:"
grep -oP "href='[^']*'" /tmp/demo-404.html | grep -i 'zyntra\|preco'
