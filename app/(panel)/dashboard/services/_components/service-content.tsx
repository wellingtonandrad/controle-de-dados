

import { LabelSubscription } from "@/components/ui/label-subscription";
import { getAllServices } from "../_data-acess/get-all-services";
import { ServicesList } from "./services-list";
import { canPermission } from "@/app/utils/permissions/canPermission";
import { ServicesInsights } from "./services-insights";


interface ServicesContentProps{
    userId: string;
}


export async function ServicesContent( {userId}: 
    ServicesContentProps ) {

    
    const services = await getAllServices({ userId: userId})
    const permissions = await canPermission({ type: "service"})

    

    return(
        
       <>
       <ServicesInsights userId={userId} />
       {!permissions.hasPermission && (
         <LabelSubscription expired={permissions.expired} />
       )}
       <ServicesList 
        services={services.data || []} permisson={permissions}
       />
       </>
    )
}