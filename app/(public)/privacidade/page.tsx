import type { Metadata } from "next"
import { LegalPageLayout } from "../_components/legal-page-layout"

export const metadata: Metadata = {
  title: "Política de privacidade | ERP profissional",
  description:
    "Política de privacidade e proteção de dados pessoais da solução ERP profissional.",
  robots: { index: true, follow: true },
}

export default function PrivacidadePage() {
  return (
    <LegalPageLayout title="Política de privacidade">
      <p>
        Esta política descreve como dados pessoais podem ser tratados no âmbito
        da <strong>solução ERP profissional</strong> (software como serviço —
        SaaS), em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD). O <strong>controlador</strong> das operações de
        tratamento realizadas diretamente pela plataforma (conta, autenticação,
        suporte e operação do serviço) é o responsável legal pelo produto,
        conforme identificação comercial e canais de contato divulgados na
        operação em vigor.
      </p>
      <p>
        Para dados inseridos pelas <strong>organizações clientes</strong> (por
        exemplo: cadastro de colaboradores, clientes, fornecedores e
        transações), a organização atua, em regra, como <strong>controladora</strong>{" "}
        e a plataforma como <strong>operadora</strong>, nos limites do contrato
        e das instruções recebidas, salvo disposição legal em contrário.
      </p>

      <h2>1. Quais dados podem ser tratados</h2>
      <p>Conforme o uso do ERP, podem ser tratados, entre outros:</p>
      <ul>
        <li>
          <strong>Cadastro e autenticação:</strong> nome, e-mail, identificadores
          de conta, perfil de acesso, registros de login e dispositivo quando
          aplicável;
        </li>
        <li>
          <strong>Dados da organização e da operação:</strong> razão social,
          documentos, contatos, unidades, parâmetros fiscais/comerciais e demais
          informações necessárias à gestão empresarial;
        </li>
        <li>
          <strong>Dados de terceiros inseridos pela organização:</strong> por
          exemplo colaboradores, clientes, fornecedores e parceiros, incluindo
          dados necessários a vendas, compras, financeiro, estoque, produção e
          relatórios;
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP, logs, tipo de navegador,
          diagnósticos de desempenho e eventos de segurança, para prestação do
          serviço, auditoria e melhoria contínua.
        </li>
      </ul>

      <h2>2. Finalidades e bases legais</h2>
      <p>Os dados podem ser utilizados para:</p>
      <ul>
        <li>
          <strong>Execução de contrato</strong> e operação do ERP (conta,
          faturamento do SaaS, suporte);
        </li>
        <li>
          <strong>Cumprimento de obrigação legal ou regulatória</strong> (por
          exemplo guarda de registros e resposta a ordens legais válidas);
        </li>
        <li>
          <strong>Legítimo interesse</strong>, quando aplicável (segurança da
          informação, prevenção a fraudes e continuidade do serviço), com
          balanceamento em relação aos direitos dos titulares;
        </li>
        <li>
          <strong>Consentimento</strong>, quando exigido para finalidades
          específicas previstas em lei.
        </li>
      </ul>

      <h2>3. Compartilhamento e encarregados (suboperadores)</h2>
      <p>
        Podem ser utilizados prestadores de hospedagem, banco de dados,
        autenticação, pagamentos, envio de e-mail, armazenamento de arquivos e
        monitoramento, estritamente na medida necessária à prestação do
        serviço, com cláusulas contratuais compatíveis com a LGPD.{" "}
        <strong>Não comercializamos dados pessoais.</strong>
      </p>

      <h2>4. Retenção e eliminação</h2>
      <p>
        Os dados são mantidos pelo tempo necessário às finalidades informadas,
        ao cumprimento de obrigações legais e à resolução de controvérsias. A
        exclusão ou anonimização observará prazos legais de guarda e as
        funcionalidades disponíveis no painel, quando couber.
      </p>

      <h2>5. Direitos dos titulares</h2>
      <p>
        Nos termos da LGPD, o titular pode solicitar confirmação de tratamento,
        acesso, correção, anonimização, portabilidade, eliminação de dados
        desnecessários, informação sobre compartilhamentos e revogação de
        consentimento, quando cabível. Pedidos relacionados a dados tratados em
        nome da organização cliente devem ser encaminhados, em primeiro lugar,
        ao responsável indicado pela própria organização; pedidos relacionados
        ao tratamento pela plataforma na qualidade de controladora devem seguir
        o canal oficial divulgado pelo serviço.
      </p>

      <h2>6. Segurança da informação</h2>
      <p>
        São adotadas medidas técnicas e administrativas razoáveis para proteger
        os dados contra acessos não autorizados, vazamentos e incidentes. Não
        há garantia absoluta de segurança; em caso de incidente com relevância
        para titulares, serão adotadas as medidas previstas em lei, inclusive
        comunicações quando obrigatórias.
      </p>

      <h2>7. Cookies e tecnologias similares</h2>
      <p>
        Podem ser empregados cookies ou tecnologias equivalentes para sessão,
        preferências, análise de uso e segurança. O usuário pode gerenciar
        cookies nas configurações do navegador.
      </p>

      <h2>8. Encarregado de dados (DPO)</h2>
      <p>
        Quando aplicável à operação, o contato do encarregado de proteção de
        dados será informado nesta página ou em canal dedicado do serviço.
      </p>

      <h2>9. Transferência internacional</h2>
      <p>
        Dependendo da infraestrutura e dos provedores utilizados, dados podem
        ser tratados fora do Brasil, observados os requisitos legais para
        garantia de nível adequado de proteção ou instrumentos cabíveis.
      </p>

      <h2>10. Alterações desta política</h2>
      <p>
        Esta política pode ser atualizada para refletir evoluções do produto,
        da legislação ou da operação. Recomenda-se revisão periódica desta
        página; alterações relevantes podem ser comunicadas por meios razoáveis
        (por exemplo aviso no painel ou por e-mail).
      </p>
    </LegalPageLayout>
  )
}
