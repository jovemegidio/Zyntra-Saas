#!/bin/bash
curl -s -X POST http://localhost:3000/api/zyntra/trial \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste Deploy","email":"teste@zyntra.com.br","phone":"11999998888","company":"Empresa Teste LTDA","cnpj":"12345678000100","segment":"industria","employees":"11-50","plan":"Profissional - R$299"}'
