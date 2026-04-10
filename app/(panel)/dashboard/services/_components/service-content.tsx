

import { getAllServices } from "../_data-acess/get-all-services";
import { ServicesList } from "./services-list";
import { canPermission } from "@/app/utils/permissions/canPermission";


interface ServicesContentProps{
    userId: string;
}


export async function ServicesContent( {userId}: 
    ServicesContentProps ) {

    
    const services = await getAllServices({ userId: userId})
    const permission = await canPermission({ type: "service"})

    console.log( permission)

    return(
       <ServicesList 
        services={services.data || []} permisson={permission}
       />
    )
}