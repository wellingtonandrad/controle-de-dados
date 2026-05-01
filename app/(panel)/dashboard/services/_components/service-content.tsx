
import { getAllServices } from "../_data-acess/get-all-services";
import { ServicesList } from "./services-list";
import { canPermission } from "@/app/utils/permissions/canPermission";
import { ServicesInsights } from "./services-insights";


interface ServicesContentProps{
    organizationId: string;
}


export async function ServicesContent( {organizationId}: 
    ServicesContentProps ) {

    
    const services = await getAllServices({ organizationId })
    const permissions = await canPermission({ type: "service"})

    

    return(
        
       <>
       <ServicesInsights organizationId={organizationId} />
       <ServicesList 
        services={services.data || []} permisson={permissions}
       />
       </>
    )
}