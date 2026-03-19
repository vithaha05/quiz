from rest_framework.renderers import JSONRenderer

class CustomJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context['response']
        
        # If it's already in our custom format, just return it
        if isinstance(data, dict) and ('error' in data):
            return super().render(data, accepted_media_type, renderer_context)

        # Standard DRF responses
        is_error = response.status_code >= 400
        
        formatted_data = {
            "error": is_error,
        }

        if is_error:
            formatted_data["message"] = data.get('detail', 'An error occurred') if isinstance(data, dict) else str(data)
            if isinstance(data, dict):
                formatted_data["details"] = data
        else:
            formatted_data["data"] = data

        return super().render(formatted_data, accepted_media_type, renderer_context)
